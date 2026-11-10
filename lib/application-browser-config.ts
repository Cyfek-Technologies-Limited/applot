export function applicationBrowserEndpoint(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env.APPLICATION_BROWSER_WS_URL?.trim()
  if (!value) {
    if (env.VERCEL) throw Object.assign(new Error('Configure the application browser service before running automatic applications.'), { code: 'APPLICATION_BROWSER_CONFIG' })
    return undefined
  }
  try {
    const url = new URL(value)
    if (['wss:', 'ws:', 'https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password && !url.hash) return url.toString()
  } catch { /* Do not expose endpoint tokens in errors. */ }
  throw Object.assign(new Error('APPLICATION_BROWSER_WS_URL must be the complete browser connection URL, not an API token.'), { code: 'APPLICATION_BROWSER_CONFIG' })
}
