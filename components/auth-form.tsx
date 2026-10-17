'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email'))
    const password = String(form.get('password'))
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name: String(form.get('name')) })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (error) {
      console.error('[applot] auth error', error)
      setError(
        isSignUp
          ? 'Could not create your account. Check your details and try again.'
          : 'Invalid email or password.',
      )
      return
    }
    router.push(isSignUp ? '/dashboard/profile' : '/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-medium tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isSignUp
              ? 'Upload your CV once and let the agent do the applying.'
              : 'Sign in to check on your applications.'}
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" required autoComplete="name" className="h-11" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" className="h-11" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="h-11"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="mt-2 h-11 rounded-full">
            {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          {isSignUp ? 'Already have an account? ' : 'New to Applot? '}
          <Link
            href={isSignUp ? '/sign-in' : '/sign-up'}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </main>
  )
}
