'use client'

import { FileText, Upload } from 'lucide-react'
import { useActionState } from 'react'
import { uploadResume } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'

export function ResumeUpload({ fileName, preview }: { fileName: string; preview: string }) {
  const [state, action, pending] = useActionState(uploadResume, null)

  return (
    <section
      aria-labelledby="cv-heading"
      className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="cv-heading" className="font-display text-xl font-semibold">
          Your CV
        </h2>
        <p className="text-sm text-muted-foreground">PDF or .txt, up to 4MB. We read it to match and tailor applications.</p>
      </div>
      {fileName && (
        <div className="flex items-start gap-3 rounded-xl bg-secondary p-4">
          <FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm font-medium">{fileName}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{preview}</p>
          </div>
        </div>
      )}
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="resume" className="sr-only">
          Resume file
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          required
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="flex-1 text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
        />
        <Button type="submit" disabled={pending} className="h-10 gap-2 rounded-full px-5">
          <Upload className="size-4" aria-hidden="true" />
          {pending ? 'Reading…' : fileName ? 'Replace CV' : 'Upload CV'}
        </Button>
      </form>
      {state && (
        <p role="status" className={state.ok ? 'text-sm text-primary' : 'text-sm text-destructive'}>
          {state.message}
        </p>
      )}
    </section>
  )
}
