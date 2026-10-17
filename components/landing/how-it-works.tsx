import Link from 'next/link'
import { JOB_SOURCES } from '@/lib/jobs/source-names'

const steps = [
  {
    title: 'Upload your CV once',
    body: 'Drop in your resume and answer the questions every job site asks: work authorization, salary, notice period, links.',
  },
  {
    title: 'Tell the agent what you want',
    body: 'Pick your target roles, locations and a daily limit between 1 and 100 applications.',
  },
  {
    title: 'It hunts and tailors',
    body: 'The agent scans verified job boards, scores every listing against your CV, and writes a tailored cover letter for each match.',
  },
  {
    title: 'Track everything',
    body: 'Every application lands in your dashboard, from prepared to applied to interview. Recruiters reply straight to your inbox.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 py-24 lg:px-14">
      <div className="flex flex-col gap-4 md:max-w-2xl">
        <p className="text-sm font-semibold text-primary">How it works</p>
        <h2 className="text-balance font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
          Stop filling the same form fifty times a day
        </h2>
      </div>
      <ol className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-4 bg-card p-8">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 font-display text-sm font-bold text-primary">
              {i + 1}
            </span>
            <h3 className="font-display text-xl font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function About() {
  return (
    <section id="about" className="mx-auto w-full max-w-7xl scroll-mt-8 px-6 pb-24 lg:px-14">
      <div className="flex flex-col items-start justify-between gap-10 rounded-3xl border border-border bg-card p-8 md:flex-row md:items-end md:p-12">
        <div className="flex max-w-xl flex-col gap-4">
          <h2 className="text-balance font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Legit jobs only
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Applot only pulls listings from established job boards with public APIs, so you never
            waste an application on a scam posting. Live sources today:
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Job sources">
            {JOB_SOURCES.map((s) => (
              <li
                key={s}
                className="rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-secondary-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/sign-up"
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Start applying
        </Link>
      </div>
    </section>
  )
}
