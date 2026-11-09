import { handleAgentRequest } from '@/lib/agent-http'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  return handleAgentRequest(request, async () => {
    // Keep auth/database initialization and browser imports inside the error boundary.
    const { getSession } = await import('@/lib/auth')
    return {
      getSession,
      run: async (userId: string) => {
        const { runAgentForUser } = await import('@/lib/agent')
        return runAgentForUser(userId)
      },
    }
  })
}
