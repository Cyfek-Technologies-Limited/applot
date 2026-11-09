'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestAgentRun, type AgentRequestResult } from '@/lib/agent-request'
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
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<AgentRequestResult | null>(null)
  const running = useRef(false)
  const router = useRouter()

  async function run() {
    if (running.current) return
    running.current = true
    setPending(true)
    setResult(null)
    try {
      const response = await requestAgentRun()
      setResult(response)
      if (response.ok) {
        toast.success(response.message)
        router.refresh()
      } else toast.error(response.message)
    } finally {
      running.current = false
      setPending(false)
    }
  }

  return (
    <div className="flex max-w-xl flex-wrap items-center gap-3">
      <span className="text-xs text-muted-foreground">
        {usedToday}/{dailyLimit} today
      </span>
      <Button
        disabled={disabled || pending}
        className="h-11 gap-2 rounded-full px-6"
        onClick={run}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="size-4" aria-hidden="true" />
        )}
        {pending ? 'Agent is finding and applying…' : 'Find & apply automatically'}
      </Button>
      {result && <p role={result.ok ? 'status' : 'alert'} className={`w-full text-sm leading-6 ${result.ok ? 'text-muted-foreground' : 'text-destructive'}`}>
        {result.message}{result.reference && <> Error reference: {result.reference}</>}
      </p>}
    </div>
  )
}
