import 'server-only'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import type { Profile } from '@/lib/generated/prisma/client'
import { searchJobs, type JobListing } from '@/lib/jobs/sources'

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
    console.error('[applot] AI scoring failed, using keyword scoring', error)
    return fallback()
  }
}

async function draftCoverLetter(job: JobListing, profile: Profile) {
  try {
    const { text } = await generateText({
      model: MODEL,
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
    console.error('[applot] cover letter failed', error)
    return `Dear ${job.company} team,\n\nI'm excited to apply for the ${job.title} role. ${profile.summary || profile.headline}\n\nWith ${profile.yearsExperience}+ years of experience and strengths in ${profile.skills.slice(0, 4).join(', ')}, I'd love to contribute to your team.\n\nBest regards,\n${profile.fullName}`
  }
}

export async function runAgentForUser(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile || profile.targetRoles.length === 0) {
    throw new Error('Add at least one target role to your profile first.')
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const queuedToday = await prisma.application.count({
    where: { userId, appliedBy: 'AGENT', createdAt: { gte: startOfDay } },
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
    select: { externalId: true },
  })
  const seen = new Set(existing.map((e) => e.externalId))

  let jobs = (await searchJobs(profile.targetRoles)).filter((j) => !seen.has(j.externalId))
  if (profile.remoteOnly) jobs = jobs.filter((j) => j.remote)
  if (profile.preferredLocations.length && !profile.remoteOnly) {
    const locs = profile.preferredLocations.map((l) => l.toLowerCase())
    jobs = jobs.filter(
      (j) => j.remote || locs.some((l) => j.location.toLowerCase().includes(l)),
    )
  }

  const candidates = jobs.slice(0, 40)
  const scored = candidates.length ? await scoreJobs(candidates, profile) : []
  const picks = scored
    .filter((s) => s.score >= 55)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(remaining, 10))

  const letters = await Promise.all(picks.map((p) => draftCoverLetter(p.job, profile)))

  const result = await prisma.application.createMany({
    data: picks.map((p, i) => ({
      userId,
      externalId: p.job.externalId,
      source: p.job.source,
      title: p.job.title,
      company: p.job.company,
      location: p.job.location,
      url: p.job.url,
      salary: p.job.salary,
      matchScore: p.score,
      matchReason: p.reason,
      coverLetter: letters[i],
      status: 'PREPARED' as const,
      appliedBy: 'AGENT' as const,
    })),
    skipDuplicates: true,
  })

  const message = `Scanned ${jobs.length} new listings, prepared ${result.count} tailored applications.`
  await prisma.agentRun.create({
    data: { userId, jobsFound: jobs.length, jobsQueued: result.count, message },
  })
  return { found: jobs.length, queued: result.count, message }
}
