type Environment = Record<string, string | undefined>

export function normalizeAuthUrl(value: string | undefined, variable: string): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  const loopback = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(trimmed)
  const candidate = trimmed.includes('://') ? trimmed : `${loopback ? 'http' : 'https'}://${trimmed}`
  try {
    const url = new URL(candidate)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error()
    return url.toString().replace(/\/$/, '')
  } catch {
    throw new Error(`${variable} must be an HTTP(S) URL or hostname, without credentials, query parameters, or a fragment.`)
  }
}

export function resolveAuthBaseURL(env: Environment) {
  const configured = normalizeAuthUrl(env.BETTER_AUTH_URL, 'BETTER_AUTH_URL')
    || normalizeAuthUrl(env.VERCEL_PROJECT_PRODUCTION_URL, 'VERCEL_PROJECT_PRODUCTION_URL')
    || normalizeAuthUrl(env.VERCEL_URL, 'VERCEL_URL')
    || normalizeAuthUrl(env.V0_RUNTIME_URL, 'V0_RUNTIME_URL')
  if (env.NODE_ENV === 'development') {
    return {
      // Use the request's actual port even when .env contains a fixed base URL.
      allowedHosts: [...new Set(['localhost:*', '127.0.0.1:*', ...(configured ? [new URL(configured).host] : [])])],
      fallback: configured || 'http://localhost:3000',
    }
  }
  return configured
}

export function resolveTrustedOrigins(env: Environment): string[] {
  const variables = env.NODE_ENV === 'development'
    ? ['V0_RUNTIME_URL', 'V0_DEV_APP_URL', 'V0_BUILD_URL', 'V0_SANDBOX_URL']
    : env.NODE_ENV === 'production' ? ['VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL'] : []
  const origins = variables.flatMap(variable => {
    const value = normalizeAuthUrl(env[variable], variable)
    return value ? [new URL(value).origin] : []
  })
  if (env.NODE_ENV === 'development') origins.push('http://localhost:*', 'http://127.0.0.1:*')
  return [...new Set(origins)]
}
