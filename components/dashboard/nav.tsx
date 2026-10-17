'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Applications' },
  { href: '/dashboard/profile', label: 'Profile & CV' },
]

export function DashboardNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav aria-label="Dashboard" className="flex items-center gap-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
