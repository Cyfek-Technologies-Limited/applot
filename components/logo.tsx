import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('flex items-end gap-2 text-foreground', className)}
      aria-label="Applot home"
    >
      <span className="flex h-7 items-end gap-0.5" aria-hidden="true">
        <span className="h-4 w-1.5 rounded-t-sm bg-primary" />
        <span className="h-7 w-1.5 rounded-t-sm bg-primary" />
        <span className="h-5 w-1.5 rounded-t-sm bg-primary" />
        <span className="relative h-7 w-1.5 rounded-t-sm bg-primary">
          <span className="absolute -top-2 left-0 size-1.5 rounded-full bg-primary" />
        </span>
      </span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight">applot</span>
    </Link>
  )
}
