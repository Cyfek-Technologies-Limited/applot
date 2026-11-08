'use server'

import { revalidatePath } from 'next/cache'
import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { requireUserId } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractResumeProfile, type ResumeProfile } from '@/lib/resume-profile'
import { encryptResume } from '@/lib/resume-storage'

export type FormState = { ok: boolean; message: string } | null
export type ResumeUploadState = {
  ok: boolean
  message: string
  fields?: ResumeProfile
} | null

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

export async function uploadResume(_prev: ResumeUploadState, formData: FormData): Promise<ResumeUploadState> {
  const userId = await requireUserId()
  const file = formData.get('resume')
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function' || file.size === 0) {
    return { ok: false, message: 'No file was received. Choose your CV and try uploading again.' }
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
    } else if (/\.(docx|odt|rtf)$/i.test(file.name) || [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text', 'application/rtf', 'text/rtf',
    ].includes(file.type)) {
      const { parseOffice } = await import('officeparser')
      const document = await parseOffice(Buffer.from(await file.arrayBuffer()))
      text = (await document.to('text')).value
    } else if (/\.(txt|md)$/i.test(file.name) || ['text/plain', 'text/markdown'].includes(file.type)) {
      text = await file.text()
    } else {
      return { ok: false, message: 'Supported CV formats: PDF, Word (.docx), OpenDocument (.odt), RTF, TXT, and Markdown. For older .doc files, save as .docx first.' }
    }
  } catch (error) {
    console.error('[applot] resume parse failed', error)
    return { ok: false, message: 'Could not read this document. Check that it opens correctly and is not password protected, or export it to another supported format.' }
  }
  text = text.replace(/\s+\n/g, '\n').trim().slice(0, 20000)
  if (!text) return { ok: false, message: 'No readable text found. For a scanned CV, use OCR to create a searchable document, then upload it again.' }

  const attachment = encryptResume(new Uint8Array(await file.arrayBuffer()))
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, resumeFileName: file.name, resumeText: text, resumeData: attachment, resumeMimeType: file.type },
    update: { resumeFileName: file.name, resumeText: text, resumeData: attachment, resumeMimeType: file.type },
  })
  revalidatePath('/dashboard', 'layout')
  const { fields, complete } = await extractResumeProfile(text)
  return {
    ok: true,
    fields,
    message: complete
      ? 'CV uploaded. Review the details filled below, complete any gaps, then save your profile.'
      : 'CV uploaded. Details found in your CV have been filled below. Review the suggestions, complete any gaps, then save your profile.',
  }
}
