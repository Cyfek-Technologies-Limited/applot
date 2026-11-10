import type { AgentRequestResult } from './agent-request'

const profileErrors = new Set([
  'Add at least one target role to your profile first.',
  'Add your current location so the agent can check hiring eligibility.',
  'Upload your CV again to enable automatic submission with the original attachment.',
  'Save your full name and email in your profile first.',
])

type Dependencies = {
  getSession: () => Promise<{ user?: { id: string } } | null>
  run: (userId: string) => Promise<{ message: string }>
}

export async function handleAgentRequest(request: Request, load: () => Promise<Dependencies>): Promise<Response> {
  const reference = crypto.randomUUID()
  const json = (body: AgentRequestResult, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) return json({ ok: false, message: 'Refresh the page and try again.' }, 403)
  try {
    const dependencies = await load()
    const session = await dependencies.getSession()
    if (!session?.user) return json({ ok: false, message: 'Your session has expired. Sign in again to run the agent.' }, 401)
    const result = await dependencies.run(session.user.id)
    return json({ ok: true, message: result.message })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (profileErrors.has(message)) return json({ ok: false, message }, 422)
    if (message === 'Your agent is already running. Please wait for it to finish.') return json({ ok: false, message }, 409)
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : undefined
    if (code === 'APPLICATION_BROWSER_CONFIG') return json({ ok: false, message: 'Automatic applications are blocked by browser setup. APPLICATION_BROWSER_WS_URL must contain the complete browser connection URL, not just an API key. No applications were attempted.' }, 503)
    if (code === 'APPLICATION_BROWSER_UNAVAILABLE') return json({ ok: false, message: 'The application browser could not connect. Check its connection URL, credentials, and service availability. No applications were attempted.' }, 503)
    const databaseFailure = ['P1001', 'P1002', 'P1017', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code ?? '')
    // Avoid logging Prisma messages that can include CV text or application data.
    console.error('[applot] agent request failed', {
      reference, code, name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack?.split('\n').filter(line => /^\s+at /.test(line)).join('\n') : undefined,
    })
    return json({ ok: false, reference, message: databaseFailure
      ? 'The database is temporarily unavailable. Please try again shortly.'
      : 'The agent could not finish this request. Check the tracker before retrying. Contact support with the error reference if this continues.',
    }, databaseFailure ? 503 : 500)
  }
}
