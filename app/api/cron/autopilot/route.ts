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

  const results = await Promise.allSettled(profiles.map((p) => runAgentForUser(p.userId)))
  const failed = results.filter((r) => r.status === 'rejected').length

  return Response.json({ users: profiles.length, failed })
}
