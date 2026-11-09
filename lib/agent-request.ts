export type AgentRequestResult = {
  ok: boolean
  message: string
  reference?: string
}

// Shared with the client to distinguish an interrupted request from a completed run.
export async function requestAgentRun(fetcher: typeof fetch = fetch): Promise<AgentRequestResult> {
  try {
    const response = await fetcher('/api/agent/run', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(285000),
    })
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return { ok: false, message: 'The agent connection was interrupted. This run may still be finishing. Check the tracker before starting another run.' }
    }
    const result = await response.json()
    if (typeof result?.ok !== 'boolean' || typeof result?.message !== 'string') throw new Error('Invalid response')
    return { ok: response.ok && result.ok, message: result.message, ...(typeof result.reference === 'string' ? { reference: result.reference } : {}) }
  } catch {
    return { ok: false, message: 'The agent connection was interrupted. This run may still be finishing. Check the tracker before starting another run.' }
  }
}
