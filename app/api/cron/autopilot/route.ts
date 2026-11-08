import { runAgentForUser } from '@/lib/agent'
import { prisma } from '@/lib/db'

export const maxDuration = 300

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const profiles = await prisma.profile.findMany({
    where: { autopilot: true, resumeText: { not: '' } },
    select: { userId: true },
  })

  // A bounded batch avoids exhausting browser memory or serverless duration.
  const started = Date.now()
  let failed = 0
  let processed = 0
  for (const profile of profiles) {
    if (Date.now() - started > 210000) break
    try { await runAgentForUser(profile.userId) }
    catch { failed++ }
    processed++
  }

  return Response.json({ users: profiles.length, processed, deferred: profiles.length - processed, failed })
}
