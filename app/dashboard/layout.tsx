import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { Toaster } from '@/components/ui/sonner'
import { getSession } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  return (
    <div className="min-h-dvh bg-background">
      <DashboardNav name={session.user.name} email={session.user.email} />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  )
}
