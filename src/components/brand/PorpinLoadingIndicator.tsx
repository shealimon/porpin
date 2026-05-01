import { useIsFetching, useIsMutating, type Query } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { PorpinMark } from '@/components/brand/PorpinMark'
import { cn } from '@/lib/utils'

const SHOW_DELAY_MS = 200

/** Job detail queries poll while processing; that route already shows progress UI. */
function includeQueryInGlobalLoader(query: Query): boolean {
  const k = query.queryKey
  if (!Array.isArray(k)) return true
  if (k[0] === 'jobs' && k[1] === 'detail') return false
  return true
}

/**
 * Shows the Porpin mark while any React Query request is in flight (queries + mutations).
 * Delayed slightly to avoid flashing on fast cache hits.
 */
export function PorpinLoadingIndicator() {
  const fetching = useIsFetching({ predicate: includeQueryInGlobalLoader })
  const mutating = useIsMutating()
  const busy = fetching + mutating > 0

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!busy) {
      setVisible(false)
      return
    }
    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [busy])

  if (!visible) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-5 right-5 z-[200] flex items-center gap-2 rounded-full',
        'border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-md',
        'mb-[max(0px,env(safe-area-inset-bottom))] mr-[max(0px,env(safe-area-inset-right))]',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="porpin-loading-mark flex size-8 shrink-0 items-center justify-center text-foreground">
        <PorpinMark className="size-full porpin-mark--loading" aria-hidden />
      </span>
      <span className="max-w-[10rem] truncate text-xs font-medium text-muted-foreground tab:max-w-none">
        Loading…
      </span>
    </div>
  )
}
