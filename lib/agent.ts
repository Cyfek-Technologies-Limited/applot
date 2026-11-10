import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { Profile } from '@/lib/generated/prisma/client'
import { searchJobs, type JobListing } from '@/lib/jobs/sources'
import { checkApplicationBrowser, submitApplication, supportedApplicationUrl } from '@/lib/jobs/submit-application'
import { matchesLocation } from '@/lib/jobs/location'
import { canonicalJobUrl } from '@/lib/jobs/identity'

const MODEL = 'openai/gpt-5-mini'

const scoreSchema = z.object({
  matches: z.array(
    z.object({
      index: z.number().int(),
      score: z.number().int().min(0).max(100),
      reason: z.string(),
    }),
  ),
})

function keywordScore(job: JobListing, profile: Profile) {
  const hay = `${job.title} ${job.tags.join(' ')} ${job.description}`.toLowerCase()
  const title = job.title.toLowerCase()
  let score = 30
  for (const role of profile.targetRoles) {
    const words = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    if (words.length && words.every((w) => title.includes(w))) score += 35
    else if (words.some((w) => title.includes(w))) score += 15
  }
  const skillHits = profile.skills.filter((s) => hay.includes(s.toLowerCase()))
  score += Math.min(30, skillHits.length * 6)
  return {
    score: Math.min(98, score),
    reason: skillHits.length
      ? `Matches your skills: ${skillHits.slice(0, 4).join(', ')}.`
      : 'Title aligns with your target roles.',
  }
}

async function scoreJobs(jobs: JobListing[], profile: Profile) {
  const fallback = () => jobs.map((job) => ({ job, ...keywordScore(job, profile) }))
  try {
    const { output } = await generateText({
      model: MODEL,
      abortSignal: AbortSignal.timeout(20000),
      maxRetries: 1,
      output: Output.object({ schema: scoreSchema }),
      system:
        'You are a recruiting assistant. Score how well each job fits the candidate from 0-100. Penalize roles that are clearly a different discipline or seniority. Keep each reason under 20 words and speak directly to the candidate.',
      prompt: JSON.stringify({
        candidate: {
          headline: profile.headline,
          targetRoles: profile.targetRoles,
          skills: profile.skills,
          yearsExperience: profile.yearsExperience,
          resume: profile.resumeText.slice(0, 3000),
        },
        jobs: jobs.map((j, index) => ({
          index,
          title: j.title,
          company: j.company,
          location: j.location,
          tags: j.tags.slice(0, 8),
          summary: j.description.slice(0, 400),
        })),
      }),
    })
    const byIndex = new Map(output.matches.map((m) => [m.index, m]))
    return jobs.map((job, i) => {
      const m = byIndex.get(i)
      return m
        ? { job, score: m.score, reason: m.reason }
        : { job, ...keywordScore(job, profile) }
    })
  } catch (error) {
    // Log support identifiers, never prompts, CVs, credentials, or response bodies.
    const details = error as { name?: unknown; statusCode?: unknown; generationId?: unknown }
    console.warn('[applot] AI scoring unavailable after retry; using keyword scoring', {
      name: typeof details?.name === 'string' ? details.name : 'RequestError',
      statusCode: typeof details?.statusCode === 'number' ? details.statusCode : undefined,
      generationId: typeof details?.generationId === 'string' ? details.generationId : undefined,
    })
    return fallback()
  }
}

async function draftCoverLetter(job: JobListing, profile: Profile) {
  try {
    const { text } = await generateText({
      model: MODEL,
      abortSignal: AbortSignal.timeout(20000),
      maxRetries: 1,
      system:
        'Write a concise, specific cover letter (max 170 words) in first person. No placeholders, no brackets, no subject line. Sign with the candidate name.',
      prompt: JSON.stringify({
        candidate: {
          name: profile.fullName,
          headline: profile.headline,
          summary: profile.summary,
          skills: profile.skills,
          yearsExperience: profile.yearsExperience,
          resume: profile.resumeText.slice(0, 3000),
        },
        job: {
          title: job.title,
          company: job.company,
          description: job.description.slice(0, 1500),
        },
      }),
    })
    return text.trim()
  } catch (error) {
    console.error('[applot] cover letter failed', error instanceof Error ? error.name : 'RequestError')
    return `Dear ${job.company} team,\n\nI'm excited to apply for the ${job.title} role. ${profile.summary || profile.headline}\n\nWith ${profile.yearsExperience}+ years of experience and strengths in ${profile.skills.slice(0, 4).join(', ')}, I'd love to contribute to your team.\n\nBest regards,\n${profile.fullName}`
  }
}

export async function runAgentForUser(userId: string) {
  const token = crypto.randomUUID()
  const lease = await prisma.$queryRaw<{ userId: string }[]>`
    INSERT INTO "agent_lease" ("userId", "token", "expiresAt")
    VALUES (${userId}, ${token}, NOW() + INTERVAL '15 minutes')
    ON CONFLICT ("userId") DO UPDATE SET "token" = EXCLUDED."token", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "agent_lease"."expiresAt" < NOW()
    RETURNING "userId"
  `
  if (!lease.length) throw new Error('Your agent is already running. Please wait for it to finish.')
  try { return await runLockedAgent(userId) }
  finally { await prisma.agentLease.deleteMany({ where: { userId, token } }) }
}

async function runLockedAgent(userId: string) {
  const started = Date.now()
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile || profile.targetRoles.length === 0) {
    throw new Error('Add at least one target role to your profile first.')
  }
  if (!profile.location.trim()) throw new Error('Add your current location so the agent can check hiring eligibility.')
  if (!profile.resumeData) throw new Error('Upload your CV again to enable automatic submission with the original attachment.')
  if (!profile.fullName.trim() || !profile.email.trim()) throw new Error('Save your full name and email in your profile first.')

  // A shared browser outage must stop the run, not fail every job and consume
  // the candidate's daily allowance. This check sends no candidate data.
  await checkApplicationBrowser()

  await prisma.application.updateMany({ where: {
    userId, archivedAt: null, status: 'PREPARED', submissionStatus: 'FAILED',
    submissionMessage: 'The application browser could not prepare this form. Check the browser service configuration; no submission was confirmed.',
  }, data: { submissionStatus: 'RETRY', submissionMessage: 'Browser connectivity restored. Queued for a new attempt.' } })

  // A process interrupted during submission may already have sent it. Never retry blindly.
  await prisma.application.updateMany({ where: { userId, submissionStatus: 'SUBMITTING' }, data: { submissionStatus: 'UNKNOWN', submissionMessage: 'The previous run was interrupted. Check for an employer confirmation before trying again.' } })

  // Revisit the old host-only rejection once with the listing-link resolver.
  // These rows were rejected before opening a browser, so no submission occurred.
  await prisma.application.updateMany({ where: {
    userId, archivedAt: null, status: 'PREPARED', submissionStatus: 'UNSUPPORTED',
    submissionMessage: 'Automatic submission is currently supported for standard Lever, Greenhouse, and Ashby forms. This employer requires another integration.',
    OR: ['himalayas.app', 'remotive.com', 'jobicy.com', 'remoteok.com', 'www.arbeitnow.com', 'arbeitnow.com', 'apply.workable.com'].map(host => ({ url: { startsWith: `https://${host}/` } })),
  }, data: { submissionStatus: 'RETRY', submissionMessage: 'The agent will check this listing for an employer application form on this run.' } })

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const queuedToday = await prisma.application.count({
    where: { userId, appliedBy: 'AGENT', submissionAttemptedAt: { gte: startOfDay } },
  })
  const remaining = Math.max(0, profile.dailyLimit - queuedToday)
  if (remaining === 0) {
    await prisma.agentRun.create({
      data: { userId, status: 'limit', message: 'Daily limit reached.' },
    })
    return { found: 0, queued: 0, message: 'Daily limit reached. The agent resumes tomorrow.' }
  }

  const existing = await prisma.application.findMany({
    where: { userId },
    select: { externalId: true, url: true, title: true, company: true },
  })
  const seen = new Set(existing.map((e) => e.externalId))

  const identity = (title: string, company: string) => `${company}:${title}`.toLowerCase().replace(/[^a-z0-9]/g, '')
  const known = new Set(existing.map(j => identity(j.title, j.company)))
  const urls = new Set(existing.map(j => canonicalJobUrl(j.url)))
  const jobs = (await searchJobs(profile.targetRoles, profile)).filter(j => !seen.has(j.externalId) && !known.has(identity(j.title, j.company)) && !urls.has(canonicalJobUrl(j.url)))

  const candidates = jobs.slice(0, 40)
  const scored = candidates.length ? await scoreJobs(candidates, profile) : []
  const selectedIdentities = new Set<string>()
  const picks = scored
    .filter((s) => s.score >= 55)
    .sort((a, b) => Number(supportedApplicationUrl(b.job.url)) - Number(supportedApplicationUrl(a.job.url)) || b.score - a.score)
    .filter(({ job }) => {
      const key = identity(job.title, job.company)
      if (selectedIdentities.has(key)) return false
      selectedIdentities.add(key)
      return true
    })
    .slice(0, Math.min(remaining, 10))

  const letters = await Promise.all(picks.map((p) => draftCoverLetter(p.job, profile)))

  const result = await prisma.application.createMany({
    data: picks.map((p, i) => ({
      userId,
      externalId: p.job.externalId,
      source: p.job.source,
      title: p.job.title,
      company: p.job.company,
      location: p.job.remote && !/remote|worldwide|anywhere/i.test(p.job.location) ? `Remote · ${p.job.location}` : p.job.location,
      url: p.job.url,
      salary: p.job.salary,
      matchScore: p.score,
      matchReason: p.reason,
      coverLetter: letters[i],
      status: 'PREPARED' as const,
      appliedBy: 'AGENT' as const,
      jobMetadata: { remote: p.job.remote, allowedCountries: p.job.allowedCountries ?? [], allowedOffsets: p.job.allowedOffsets ?? [], timezoneRestricted: p.job.timezoneRestricted ?? false, description: p.job.description },
    })),
    skipDuplicates: true,
  })

  const queued = await prisma.application.findMany({
    where: { userId, archivedAt: null, status: 'PREPARED', submissionStatus: { in: ['NOT_ATTEMPTED', 'RETRY'] } },
    orderBy: { createdAt: 'asc' }, take: Math.min(remaining, 10),
  })
  let submitted = 0
  let needsAttention = 0
  for (const application of queued) {
    if (Date.now() - started > 210000) break
    // Old prepared listings must pass the same location eligibility checks.
    const metadata = application.jobMetadata as { remote?: boolean; allowedCountries?: string[]; allowedOffsets?: number[]; timezoneRestricted?: boolean; description?: string }
    if (!matchesLocation({ ...application, ...metadata, tags: [], remote: metadata.remote ?? /remote|worldwide|anywhere/i.test(application.location), description: metadata.description ?? '' }, profile)) {
      await prisma.application.update({ where: { id: application.id }, data: { submissionStatus: 'NEEDS_INPUT', submissionMessage: 'Hiring location cannot be verified against your current preferences. No application was sent.' } })
      needsAttention++
      continue
    }
    const claimed = await prisma.application.updateMany({ where: { id: application.id, submissionStatus: { in: ['NOT_ATTEMPTED', 'RETRY'] } }, data: { submissionStatus: 'SUBMITTING', submissionAttemptedAt: new Date() } })
    if (!claimed.count) continue
    const answers = application.submissionAnswers as Record<string, string>
    const outcome = await submitApplication(application.url, profile, application.coverLetter, answers)
    await prisma.application.update({ where: { id: application.id }, data: {
      submissionStatus: outcome.status,
      submissionMessage: outcome.message,
      submissionQuestions: outcome.questions ?? [],
      ...(outcome.status === 'SUBMITTED' ? { status: 'APPLIED', appliedAt: new Date() } : {}),
    } })
    if (outcome.status === 'SUBMITTED') submitted++
    else needsAttention++
  }
  const message = `Found ${jobs.length} new location-matched listings from ${new Set(jobs.map(j => j.source)).size} sources, prepared ${result.count}, submitted ${submitted}, and ${needsAttention} need attention.`
  await prisma.agentRun.create({
    data: { userId, jobsFound: jobs.length, jobsQueued: result.count, message },
  })
  return { found: jobs.length, queued: result.count, message }
}
