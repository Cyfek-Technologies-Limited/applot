'use client'

import { FileText, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ResumeProfile } from '@/lib/resume-profile'
import type { ResumeUploadState } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function ResumeUpload({ fileName, preview, onExtracted }: { fileName: string; preview: string; onExtracted: (fields: ResumeProfile) => void }) {
  const [state, setState] = useState<ResumeUploadState>(null)
  const [pending, setPending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const [uploadedName, setUploadedName] = useState(fileName)
  const uploading = useRef(false)
  useEffect(() => {
    if (state?.ok && state.fields) onExtracted(state.fields)
  }, [state, onExtracted])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading.current) return
    const file = input.current?.files?.[0] ?? selectedFile
    if (!file?.size) {
      setState({ ok: false, message: 'Choose a non-empty CV file first.' })
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setState({ ok: false, message: 'File must be under 4MB.' })
      return
    }
    // Capture the actual file before disabling controls. Fetch supplies the
    // multipart boundary; React server-action serialization is not involved.
    const body = new FormData()
    body.set('resume', file, file.name)
    uploading.current = true
    setPending(true)
    setState(null)
    try {
      const response = await fetch('/api/profile/resume', { method: 'POST', body })
      const result: ResumeUploadState = await response.json()
      if (!result || typeof result.ok !== 'boolean' || typeof result.message !== 'string') throw new Error('Invalid upload response')
      setState(result)
      if (response.ok && result.ok) setUploadedName(file.name)
    } catch {
      setState({ ok: false, message: 'Upload failed. Check your connection and try again; your selected file has been kept.' })
    } finally {
      uploading.current = false
      setPending(false)
    }
  }

  return (
    <section
      aria-labelledby="cv-heading"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="cv-heading" className="font-display text-xl font-semibold">
          Your CV
        </h2>
        <p className="text-sm text-muted-foreground">PDF, Word (.docx), OpenDocument (.odt), RTF, or text, up to 4MB. Upload to fill your profile, then review and save.</p>
      </div>
      {uploadedName && (
        <div className="flex items-start gap-3 rounded-xl bg-secondary p-4">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium">{uploadedName}</p>
            {uploadedName === fileName && <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{preview}</p>}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="resume" className="sr-only">
          Resume file
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          ref={input}
          required
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null)
            setState(null)
          }}
          disabled={pending}
          accept=".pdf,.docx,.odt,.rtf,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/rtf,text/plain,text/markdown"
          className="flex-1 text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" disabled={pending || !selectedFile} className="h-10 gap-2 rounded-full px-5">
          <Upload className="size-4" aria-hidden="true" />
          {pending ? 'Reading…' : fileName ? 'Replace CV' : 'Upload CV'}
        </Button>
      </form>
      {selectedFile && <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
      <p className="text-xs text-muted-foreground">Learn how we handle your CV in our <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">privacy policy</Link>.</p>
      {state && (
        <p role="status" className={state.ok ? 'text-sm text-primary' : 'text-sm text-destructive'}>
          {state.message}
        </p>
      )}
    </section>
  )
}
