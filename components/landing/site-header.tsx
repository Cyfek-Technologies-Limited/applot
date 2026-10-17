import Link from 'next/link'
import { Logo } from '@/components/logo'

const links = [
  { href: '/', label: 'Home', active: true },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#about', label: 'About' },
]

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:px-14">
      <div className="flex items-center gap-10">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={
                link.active
                  ? 'rounded-full border border-foreground/15 bg-foreground/10 px-5 py-2 text-sm font-semibold text-foreground backdrop-blur'
                  : 'rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {signedIn ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="hidden rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-brand-soft/80 px-6 py-2.5 text-sm font-semibold text-brand-soft-foreground backdrop-blur transition-colors hover:bg-brand-soft"
            >
              Join us
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
