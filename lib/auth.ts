import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { resolveAuthBaseURL, resolveTrustedOrigins } from '@/lib/auth-config'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: resolveAuthBaseURL(process.env),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  trustedOrigins: resolveTrustedOrigins(process.env),
  session: {
    // Keep the persistent login for seven days from sign-in.
    expiresIn: 60 * 60 * 24 * 7,
    disableSessionRefresh: true,
  },
  ...(process.env.NODE_ENV === 'development' && process.env.V0_RUNTIME_URL
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireUserId() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}
