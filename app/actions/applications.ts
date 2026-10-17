'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { runAgentForUser } from '@/lib/agent'
import { requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApplicationStatus } from '@/lib/generated/prisma/enums'
import type { FormState } from './profile'

export async function runAgent() {
  const userId = await requireUserId()
  try {
    const result = await runAgentForUser(userId)
    revalidatePath('/dashboard', 'layout')
    return { ok: true, message: result.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Agent run failed.'
    console.error('[applot] agent run failed', error)
    return { ok: false, message }
  }
}

const statusSchema = z.enum(Object.values(ApplicationStatus) as [ApplicationStatus, ...ApplicationStatus[]])

export async function updateStatus(id: string, status: string) {
  const userId = await requireUserId()
  const parsed = statusSchema.safeParse(status)
  if (!parsed.success) return { ok: false, message: 'Invalid status' }
  await prisma.application.updateMany({
    where: { id, userId },
    data: {
      status: parsed.data,
      ...(parsed.data === 'APPLIED' ? { appliedAt: new Date() } : {}),
    },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Status updated' }
}

export async function deleteApplication(id: string) {
  const userId = await requireUserId()
  await prisma.application.deleteMany({ where: { id, userId } })
  revalidatePath('/dashboard', 'layout')
}

const manualSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required').max(200),
  company: z.string().trim().min(1, 'Company is required').max(200),
  url: z.url('Enter a valid job URL').max(500),
  location: z.string().trim().max(120),
})

export async function addManualApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()
  const parsed = manualSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  await prisma.application.create({
    data: {
      userId,
      ...parsed.data,
      externalId: `manual-${crypto.randomUUID()}`,
      source: 'Manual',
      status: 'APPLIED',
      appliedBy: 'MANUAL',
      appliedAt: new Date(),
    },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Application logged.' }
}
