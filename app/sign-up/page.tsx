import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'
import { getSession } from '@/lib/auth'

export const metadata = { title: 'Create account — Applot' }

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect('/dashboard')
  return <AuthForm mode="sign-up" />
}
