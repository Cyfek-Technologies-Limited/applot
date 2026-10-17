'use server'

import { revalidatePath } from 'next/cache'
import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type FormState = { ok: boolean; message: string } | null

const list = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30)

const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.email('Enter a valid email').max(200),
  phone: z.string().trim().max(40),
  location: z.string().trim().max(120),
  headline: z.string().trim().max(160),
  summary: z.string().trim().max(2000),
  linkedinUrl: z.string().trim().max(300),
  portfolioUrl: z.string().trim().max(300),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  workAuthorization: z.string().trim().max(120),
  salaryExpectation: z.string().trim().max(80),
  noticePeriod: z.string().trim().max(80),
  dailyLimit: z.coerce.number().int().min(1).max(100),
})

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const targetRoles = list(formData.get('targetRoles'))
  if (targetRoles.length === 0) {
    return { ok: false, message: 'Add at least one target role.' }
  }
  const data = {
    ...parsed.data,
    targetRoles,
    skills: list(formData.get('skills')),
    preferredLocations: list(formData.get('preferredLocations')),
    remoteOnly: formData.get('remoteOnly') === 'on',
    requiresSponsorship: formData.get('requiresSponsorship') === 'on',
    willingToRelocate: formData.get('willingToRelocate') === 'on',
    autopilot: formData.get('autopilot') === 'on',
  }
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: 'Profile saved. Your agent is ready.' }
}

export async function uploadResume(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId()
  const file = formData.get('resume')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose a PDF or text file.' }
  }
  if (file.size > 4 * 1024 * 1024) {
    return { ok: false, message: 'File must be under 4MB.' }
  }
  let text = ''
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()))
      const result = await extractText(pdf, { mergePages: true })
      text = result.text
    } else if (file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name)) {
      text = await file.text()
    } else {
      return { ok: false, message: 'Upload a PDF or .txt file.' }
    }
  } catch (error) {
    console.error('[applot] resume parse failed', error)
    return { ok: false, message: 'Could not read that file. Try another PDF.' }
  }
  text = text.replace(/\s+\n/g, '\n').trim().slice(0, 20000)
  if (!text) return { ok: false, message: 'No readable text found in that file.' }

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, resumeFileName: file.name, resumeText: text },
    update: { resumeFileName: file.name, resumeText: text },
  })
  revalidatePath('/dashboard', 'layout')
  return { ok: true, message: `${file.name} uploaded.` }
}
