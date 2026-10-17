import Link from 'next/link'
import { AddManualDialog } from '@/components/dashboard/add-manual'
import { ApplicationsList } from '@/components/dashboard/applications-list'
import { RunAgentButton } from '@/components/dashboard/run-agent-button'
import { requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const metadata = { title: 'Dashboard — Applot' }

export default async function DashboardPage() {
  const userId = await requireUserId()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [profile, applications, lastRun, todayCount] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.application.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.agentRun.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.application.count({
      where: { userId, appliedBy: 'AGENT', createdAt: { gte: startOfDay } },
    }),
  ])

  const ready = Boolean(profile?.targetRoles.length && profile.resumeText)
  const count = (s: string) => applications.filter((a) => a.status === s).length
  const stats = [
    { label: 'Total tracked', value: applications.length },
    { label: 'By the agent', value: applications.filter((a) => a.appliedBy === 'AGENT').length },
    { label: 'Applied', value: count('APPLIED') + count('INTERVIEW') + count('OFFER') },
    { label: 'Interviews', value: count('INTERVIEW') + count('OFFER') },
  ]

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-medium tracking-tight">Your applications</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {lastRun
              ? `Last agent run ${lastRun.createdAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}: ${lastRun.message}`
              : 'The agent has not run yet.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AddManualDialog />
          <RunAgentButton
            disabled={!ready}
            usedToday={todayCount}
            dailyLimit={profile?.dailyLimit ?? 25}
          />
        </div>
      </section>

      {!ready && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/40 bg-primary/10 p-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Finish your profile to start the agent</p>
            <p className="text-sm text-muted-foreground">
              Upload your CV and add at least one target role.
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Set up profile
          </Link>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 bg-card p-6">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="font-display text-3xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <ApplicationsList
        applications={applications.map((a) => ({
          id: a.id,
          title: a.title,
          company: a.company,
          location: a.location,
          url: a.url,
          salary: a.salary,
          source: a.source,
          matchScore: a.matchScore,
          matchReason: a.matchReason,
          coverLetter: a.coverLetter,
          status: a.status,
          appliedBy: a.appliedBy,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
