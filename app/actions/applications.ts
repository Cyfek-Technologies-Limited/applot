'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApplicationStatus } from '@/lib/generated/prisma/enums'
import type { FormState } from './profile'

const statusSchema = z.enum(Object.values(ApplicationStatus) as [ApplicationStatus, ...ApplicationStatus[]])

export async function updateStatus(id: string, status: string) {
  const userId = await requireUserId()
  const parsed = statusSchema.safeParse(status)
  if (!parsed.success) return { ok: false, message: 'Invalid status' }
  await prisma.application.updateMany({
    where: { id, userId, submissionStatus: { not: 'SUBMITTING' } },
    data: {
      status: parsed.data,
      ...(parsed.data === 'APPLIED' ? { appliedAt: new Date() } : {}),
    },
  })
  if (parsed.data === 'APPLIED') {
    await prisma.application.updateMany({ where: { id, userId, submissionStatus: { notIn: ['SUBMITTED', 'SUBMITTING'] } }, data: { appliedBy: 'MANUAL', submissionStatus: 'MANUAL', submissionMessage: 'You marked this application as submitted yourself.' } })
  }
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Status updated' }
}

export async function deleteApplication(id: string) {
  const userId = await requireUserId()
  // Keep submission history for de-duplication, even when hidden from the tracker.
  await prisma.application.updateMany({ where: { id, userId, submissionStatus: { not: 'SUBMITTING' } }, data: { archivedAt: new Date() } })
  revalidatePath('/dashboard', 'layout')
}

export async function saveApplicationAnswers(id: string, formData: FormData) {
  const userId = await requireUserId()
  const application = await prisma.application.findFirst({ where: { id, userId } })
  if (!application || !['NEEDS_INPUT', 'FAILED'].includes(application.submissionStatus)) return { ok: false, message: 'This application cannot be retried automatically.' }
  const questions = Array.isArray(application.submissionQuestions) ? application.submissionQuestions.filter((q): q is string => typeof q === 'string') : []
  const answers: Record<string, string> = Object.fromEntries(Object.entries(application.submissionAnswers as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  for (const question of questions) {
    const value = String(formData.get(question) ?? '').trim().slice(0, 3000)
    if (value) answers[question] = value
  }
  await prisma.application.updateMany({ where: { id, userId, submissionStatus: { in: ['NEEDS_INPUT', 'FAILED'] } }, data: { submissionAnswers: answers, submissionStatus: 'RETRY', submissionMessage: 'Answers saved. The agent will retry this application on its next run.' } })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Answers saved. Run the agent to submit.' }
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
