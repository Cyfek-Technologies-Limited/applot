'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { runAgent } from '@/app/actions/applications'
import { Button } from '@/components/ui/button'

export function RunAgentButton({
  disabled,
  usedToday,
  dailyLimit,
}: {
  disabled: boolean
  usedToday: number
  dailyLimit: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">
        {usedToday}/{dailyLimit} today
      </span>
      <Button
        disabled={disabled || pending}
        className="h-11 gap-2 rounded-full px-6"
        onClick={() =>
          startTransition(async () => {
            const result = await runAgent()
            if (result.ok) toast.success(result.message)
            else toast.error(result.message)
          })
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        {pending ? 'Agent is hunting…' : 'Run agent now'}
      </Button>
    </div>
  )
}
