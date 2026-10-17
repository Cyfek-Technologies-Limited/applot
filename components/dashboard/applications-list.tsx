'use client'

import { Bot, ExternalLink, Trash2, User } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteApplication, updateStatus } from '@/app/actions/applications'
import { cn } from '@/lib/utils'

export type ApplicationItem = {
  id: string
  title: string
  company: string
  location: string
  url: string
  salary: string
  source: string
  matchScore: number
  matchReason: string
  coverLetter: string
  status: string
  appliedBy: string
  createdAt: string
}

const STATUSES = [
  { value: 'PREPARED', label: 'Ready to send' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'REJECTED', label: 'Rejected' },
]

const statusStyle: Record<string, string> = {
  PREPARED: 'bg-brand-soft/20 text-brand-soft-foreground',
  APPLIED: 'bg-secondary text-secondary-foreground',
  INTERVIEW: 'bg-primary/20 text-primary',
  OFFER: 'bg-primary text-primary-foreground',
  REJECTED: 'bg-muted text-muted-foreground',
}

const filters = [
  { value: 'all', label: 'All' },
  { value: 'agent', label: 'By agent' },
  { value: 'manual', label: 'Manual' },
  ...STATUSES,
]

export function ApplicationsList({ applications }: { applications: ApplicationItem[] }) {
  const [filter, setFilter] = useState('all')
  const visible = useMemo(
    () =>
      applications.filter((a) => {
        if (filter === 'all') return true
        if (filter === 'agent') return a.appliedBy === 'AGENT'
        if (filter === 'manual') return a.appliedBy === 'MANUAL'
        return a.status === filter
      }),
    [applications, filter],
  )

  return (
    <section aria-labelledby="apps-heading" className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 id="apps-heading" className="font-display text-xl font-semibold">
          Tracker
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter applications">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {applications.length === 0
            ? 'No applications yet. Run the agent to find your first matches.'
            : 'Nothing matches this filter.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((app) => (
            <ApplicationRow key={app.id} app={app} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ApplicationRow({ app }: { app: ApplicationItem }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function changeStatus(status: string) {
    startTransition(async () => {
      const r = await updateStatus(app.id, status)
      if (!r.ok) toast.error(r.message)
    })
  }

  function openAndApply() {
    window.open(app.url, '_blank', 'noopener,noreferrer')
    if (app.coverLetter) {
      navigator.clipboard?.writeText(app.coverLetter).then(
        () => toast.success('Cover letter copied. Paste it into the application.'),
        () => undefined,
      )
    }
  }

  return (
    <li
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-opacity',
        pending && 'opacity-60',
      )}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {app.appliedBy === 'AGENT' ? (
                <Bot className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <User className="size-3.5" aria-hidden="true" />
              )}
              {app.appliedBy === 'AGENT' ? 'Agent' : 'You'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{app.source}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={app.createdAt}>
              {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </time>
          </div>
          <h3 className="truncate font-semibold">{app.title}</h3>
          <p className="text-sm text-muted-foreground">
            {[app.company, app.location, app.salary].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {app.appliedBy === 'AGENT' && (
            <span
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
              title="Match score"
            >
              {app.matchScore}% match
            </span>
          )}
          <label className="sr-only" htmlFor={`status-${app.id}`}>
            Status
          </label>
          <select
            id={`status-${app.id}`}
            value={app.status}
            disabled={pending}
            onChange={(e) => changeStatus(e.target.value)}
            className={cn(
              'h-8 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusStyle[app.status],
            )}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value} className="bg-card text-foreground">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {app.matchReason && <p className="text-sm leading-relaxed text-muted-foreground">{app.matchReason}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openAndApply}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          {app.status === 'PREPARED' ? 'Open & apply' : 'View listing'}
        </button>
        {app.status === 'PREPARED' && (
          <button
            type="button"
            onClick={() => changeStatus('APPLIED')}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            Mark as sent
          </button>
        )}
        {app.coverLetter && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {open ? 'Hide cover letter' : 'Cover letter'}
          </button>
        )}
        <button
          type="button"
          onClick={() => startTransition(() => deleteApplication(app.id))}
          className="ml-auto rounded-full p-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Remove application</span>
        </button>
      </div>

      {open && (
        <pre className="whitespace-pre-wrap rounded-xl bg-secondary p-4 font-sans text-sm leading-relaxed text-secondary-foreground">
          {app.coverLetter}
        </pre>
      )}
    </li>
  )
}
