import { About, HowItWorks } from '@/components/landing/how-it-works'
import { Hero, HeroBackground } from '@/components/landing/hero'
import { SiteHeader } from '@/components/landing/site-header'
import { getSession } from '@/lib/auth'

export default async function HomePage() {
  const session = await getSession()
  return (
    <main className="min-h-dvh bg-background">
      <div className="relative flex min-h-dvh flex-col">
        <HeroBackground />
        <SiteHeader signedIn={Boolean(session?.user)} />
        <Hero />
      </div>
      <HowItWorks />
      <About />
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        {'© 2026 Applot. Apply smarter.'}
      </footer>
    </main>
  )
}
