'use client'

import { Plus, X } from 'lucide-react'
import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { addManualApplication } from '@/app/actions/applications'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AddManualDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState(addManualApplication, null)
  const [handled, setHandled] = useState<typeof state>(null)

  useEffect(() => {
    if (!state || state === handled) return
    setHandled(state)
    if (state.ok) {
      toast.success(state.message)
      formRef.current?.reset()
      dialogRef.current?.close()
    } else {
      toast.error(state.message)
    }
  }, [state, handled])

  return (
    <>
      <Button
        variant="outline"
        className="h-11 gap-2 rounded-full px-5"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Plus className="size-4" aria-hidden="true" />
        Log application
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="manual-title"
        className="m-auto w-full max-w-md rounded-2xl border border-border bg-card p-0 text-card-foreground backdrop:bg-background/80"
      >
        <form ref={formRef} action={action} className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <h2 id="manual-title" className="font-display text-xl font-semibold">
              Log a manual application
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-title">Job title</Label>
            <Input id="m-title" name="title" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-company">Company</Label>
            <Input id="m-company" name="company" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-url">Job URL</Label>
            <Input id="m-url" name="url" type="url" required placeholder="https://" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="m-location">Location</Label>
            <Input id="m-location" name="location" />
          </div>
          <Button type="submit" disabled={pending} className="mt-2 h-11 rounded-full">
            {pending ? 'Saving…' : 'Save application'}
          </Button>
        </form>
      </dialog>
    </>
  )
}
