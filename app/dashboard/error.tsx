'use client'

import Link from 'next/link'

export default function DashboardError({ error, reset }: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <section role="alert" className="flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-8">
    <h1 className="font-display text-2xl font-semibold">We couldn’t refresh your tracker</h1>
    <p className="text-sm leading-7 text-muted-foreground">Your agent run may still be finishing. Reload the tracker to check its progress before starting another run.</p>
    {error.digest && <p className="text-xs text-muted-foreground">Error reference: {error.digest}</p>}
    <div className="flex flex-wrap gap-3">
      <button onClick={reset} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Reload tracker</button>
      <Link href="/dashboard/profile" className="rounded-full border border-border px-5 py-2.5 text-sm">Profile & CV</Link>
    </div>
  </section>
}
