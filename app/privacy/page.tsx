import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export const metadata: Metadata = {
  title: 'Privacy policy | Applot',
  description: 'How Applot handles your account, CV, profile, and job application information.',
}

const sections = [
  { title: 'Information you provide', body: 'Applot processes your account name, email, authentication information, and the CV you upload. We store its filename, extracted text, and an encrypted copy of the original document so it can be attached to applications. Your profile may include contact details, location, work history, skills, links, job preferences, salary expectations, work authorization, and answers to common application questions. Application records include job details, cover letters, screening answers, submission outcomes, status, notes, and agent activity.' },
  { title: 'How we use your information', body: 'We use this information to provide your account, fill your profile, find and rank relevant jobs, draft application materials, track applications, and run the agent when enabled. We also process session and technical information to maintain security and diagnose errors. Where applicable, processing relies on providing the service you request, legitimate interests in operating and securing it, legal obligations, or consent where required.' },
  { title: 'CV extraction and AI features', body: 'CV extraction can run locally on our server. When AI features are available, relevant CV text, profile details, and job descriptions are sent through Vercel AI Gateway to the configured model provider, currently OpenAI. These providers process that information under their own service terms. AI suggestions can be inaccurate: review extracted details and application materials before using them. Missing CV details are left for you to complete. Job scores are recommendations, not hiring decisions.' },
  { title: 'Service providers and external websites', body: 'Hosting, database, authentication, analytics, AI, and configured application browser providers may process information needed to operate Applot. Google sign-in, when available and selected, shares basic account details with us. Running the agent authorizes it to send your saved profile details, CV, screening answers, and cover letter to supported employers for matching roles. Autopilot repeats this when enabled. Job boards and employers handle submissions under their own privacy policies. An application is marked automatically applied only after the employer displays confirmation; a prepared record alone does not mean it was submitted.' },
  { title: 'Cookies and analytics', body: 'Authentication cookies keep you signed in and protect your session. In production, Applot includes Vercel Web Analytics to understand site usage. Your browser can restrict or delete cookies, although doing so may prevent sign-in or other account features from working.' },
  { title: 'Storage, retention, and security', body: 'Saved profile, CV text, application, and account information remain in our database to support your use of the service. Logs and provider backups may have separate retention periods. We do not promise a fixed deletion deadline for every backup. Service providers may process data outside your country. Security measures reduce risk, but no online service can guarantee absolute security. Avoid uploading unnecessary sensitive information, identity documents, or details about other people.' },
  { title: 'Your choices and rights', body: 'You can review and edit your profile, replace your CV, and disable autopilot in your profile settings. Depending on applicable law, you may have rights to access, correct, delete, or receive a copy of your personal data, object to or restrict processing, and withdraw consent where processing depends on it. These rights may be subject to legal exceptions and identity verification. You may also complain to your local data protection authority.' },
  { title: 'Changes to this policy', body: 'We may update this page as the service changes. The date above identifies the latest revision. Review this policy periodically for changes to how your information is handled.' },
]

export default function PrivacyPage() {
  const email = process.env.PRIVACY_CONTACT_EMAIL
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">Your information</p>
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-6xl">Privacy policy</h1>
        <p className="mt-5 text-sm text-muted-foreground">Last updated: 8 November 2026</p>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground">This policy explains how Applot handles information when you create an account, upload a CV, and use our job search and application tools.</p>
        <div className="mt-14 grid items-start gap-12 lg:grid-cols-[220px_1fr]">
          <nav aria-label="Policy sections" className="flex flex-col gap-3 text-sm lg:sticky lg:top-8">
            {sections.map((section, i) => <a key={section.title} href={`#section-${i + 1}`} className="text-muted-foreground hover:text-primary">{section.title}</a>)}
            <a href="#contact" className="text-muted-foreground hover:text-primary">Contact</a>
          </nav>
          <article className="flex max-w-3xl flex-col gap-10">
            {sections.map((section, i) => <section id={`section-${i + 1}`} key={section.title} className="scroll-mt-8 border-t border-border pt-6">
              <h2 className="font-display text-xl font-semibold">{section.title}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </section>)}
            <section id="contact" className="scroll-mt-8 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-semibold">Contact and privacy requests</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{email ? <>For privacy questions or requests concerning your data, email <a className="text-foreground underline underline-offset-4" href={`mailto:${email}`}>{email}</a>.</> : 'A dedicated privacy contact has not yet been published. Please use your existing contact channel with the Applot operator for privacy questions or data requests.'}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">In Nigeria, you can also contact the <a href="https://ndpc.gov.ng/" className="text-foreground underline underline-offset-4">Nigeria Data Protection Commission</a>.</p>
            </section>
          </article>
        </div>
      </main>
    </div>
  )
}
