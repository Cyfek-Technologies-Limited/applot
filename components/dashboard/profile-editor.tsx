'use client'

import { useState } from 'react'
import { ProfileForm, type Defaults } from './profile-form'
import { ResumeUpload } from './resume-upload'
import type { ResumeProfile } from '@/lib/resume-profile'

export function ProfileEditor({ defaults, fileName, preview }: {
  defaults: Defaults
  fileName: string
  preview: string
}) {
  const [extracted, setExtracted] = useState<ResumeProfile>()
  return <>
    <ResumeUpload fileName={fileName} preview={preview} onExtracted={setExtracted} />
    <ProfileForm defaults={defaults} extracted={extracted} />
  </>
}
