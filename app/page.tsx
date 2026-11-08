import { About, HowItWorks } from '@/components/landing/how-it-works'
import { Hero, HeroBackdrop } from '@/components/landing/hero'
import { SiteHeader } from '@/components/landing/site-header'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await getSession()
  if (session?.user) redirect('/dashboard')
  return (
    <main className="min-h-dvh bg-background">
      <div className="relative flex min-h-dvh flex-col">
        <HeroBackdrop />
        <SiteHeader signedIn={Boolean(session?.user)} />
        <Hero />
      </div>
      <HowItWorks />
      <About />
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        {'© 2026 Applot. Apply smarter.'}
        <Link href="/privacy" className="ml-4 underline underline-offset-4 hover:text-foreground">Privacy policy</Link>
      </footer>
    </main>
  )
}
