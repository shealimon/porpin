import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Calendar, ChevronLeft, ChevronRight, History, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { HISTORY_PAGE_SIZE, listCompletedJobsPage } from '@/api/jobs'
import {
  appPageDescriptionClass,
  appPageHeaderClass,
  appPagePrimaryCtaClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { qk } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import type { JobListItem } from '@/types/job'
import { formatCurrency, formatDate } from '@/utils/format'

function HistoryRow({ row }: { row: JobListItem }) {
  const completedLabel = formatDate(row.completedAt ?? row.createdAt)
  const priceLabel =
    row.amountCents != null && row.currency
      ? formatCurrency(row.amountCents, row.currency)
      : null

  return (
    <li>
      <Link
        to={`/app/jobs/${encodeURIComponent(row.id)}`}
        className={cn(
          'group flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm',
          'no-underline decoration-transparent outline-none transition duration-200',
          'visited:text-inherit hover:no-underline',
          'hover:border-brand-500/35 hover:shadow-md',
          'dark:border-zinc-800 dark:bg-zinc-950/80 dark:hover:border-brand-500/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-zinc-950',
        )}
        aria-label={`Open completed translation: ${row.fileName}`}
      >
        <div className="min-w-0 flex-1 pr-1">
          <p
            className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50 sm:text-base"
            title={row.fileName}
          >
            {row.fileName}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span>{completedLabel}</span>
            </span>
            {priceLabel ? (
              <>
                <span className="hidden text-zinc-300 dark:text-zinc-600 sm:inline" aria-hidden>
                  ·
                </span>
                <span className="font-medium text-zinc-600 tabular-nums dark:text-zinc-300">
                  {priceLabel}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-0.5 rounded-xl px-2.5 py-2 text-sm font-semibold',
            'text-brand-700 dark:text-brand-300',
            'bg-brand-600/[0.08] transition group-hover:bg-brand-600 group-hover:text-white',
            'dark:bg-brand-500/15 dark:group-hover:bg-brand-500',
            'sm:px-3',
          )}
        >
          <span className="hidden sm:inline">Open</span>
          <ChevronRight className="size-4 sm:ml-0.5" strokeWidth={2.25} aria-hidden />
        </span>
      </Link>
    </li>
  )
}

type HistoryPaginationProps = {
  page: number
  totalItems: number
  pageSize: number
  isBusy: boolean
  onPageChange: (next: number) => void
}

function HistoryPagination({
  page,
  totalItems,
  pageSize,
  isBusy,
  onPageChange,
}: HistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)

  if (totalItems <= 0 || totalPages <= 1) {
    return null
  }

  return (
    <nav
      className={cn(
        'mt-6 flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        'dark:border-zinc-800 dark:bg-zinc-900/50',
      )}
      aria-label="History pages"
    >
      <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {start.toLocaleString('en-IN')}–{end.toLocaleString('en-IN')}
        </span>{' '}
        of {totalItems.toLocaleString('en-IN')}
      </p>
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          disabled={safePage <= 1 || isBusy}
          onClick={() => onPageChange(safePage - 1)}
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition',
            'hover:border-zinc-400 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40',
            'dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-900',
            'sm:min-h-10 sm:min-w-0',
          )}
        >
          <ChevronLeft className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
          {isBusy ? (
            <span className="inline-flex items-center justify-center gap-1.5">
              <Loader2 className="size-4 animate-spin text-brand-600 dark:text-brand-400" aria-hidden />
              <span className="sr-only">Loading</span>
            </span>
          ) : (
            <>
              {safePage} / {totalPages}
            </>
          )}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages || isBusy}
          onClick={() => onPageChange(safePage + 1)}
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition',
            'hover:border-zinc-400 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-40',
            'dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-900',
            'sm:min-h-10 sm:min-w-0',
          )}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </nav>
  )
}

function HistorySkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-950/50"
        >
          <div className="min-w-0 flex-1 space-y-2 pr-1">
            <div className="h-4 w-[min(100%,14rem)] animate-pulse rounded-md bg-zinc-200/90 dark:bg-zinc-800/90" />
            <div className="h-3 w-40 animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
          </div>
          <div className="h-9 w-14 shrink-0 animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        </li>
      ))}
    </ul>
  )
}

export function HistoryPage() {
  const [page, setPage] = useState(1)
  const pageSize = HISTORY_PAGE_SIZE

  const { data, isPending, isFetching, isPlaceholderData, isError, error, refetch } = useQuery({
    queryKey: qk.jobs.completedPage(page, pageSize),
    queryFn: () => listCompletedJobsPage(page, pageSize),
    placeholderData: keepPreviousData,
  })

  const rows = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const showSkeleton = isPending && !data && !isError
  const pageIsLoading = isFetching && isPlaceholderData

  useEffect(() => {
    if (isPlaceholderData) return
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages, isPlaceholderData])

  const summaryLine =
    !showSkeleton && !isError && total > 0
      ? `${total.toLocaleString('en-IN')} completed translation${total === 1 ? '' : 's'}`
      : null

  return (
    <div className={appPageShellClass}>
      <header className={cn(appPageHeaderClass, 'min-w-0')}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className={appPageTitleClass}>History</h1>
          {summaryLine ? (
            <span className="text-sm font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
              {summaryLine}
            </span>
          ) : null}
        </div>
        <p className={appPageDescriptionClass}>
          Download past Hinglish outputs anytime. Jobs are listed with the newest first (
          {pageSize} per page).
        </p>
      </header>

      {isError && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50/90 p-5 text-sm text-red-900 shadow-sm dark:border-red-900/45 dark:bg-red-950/35 dark:text-red-100"
          role="alert"
        >
          <p className="font-medium">Couldn&apos;t load history</p>
          <p className="mt-1 opacity-90">
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </p>
          <button
            type="button"
            className={cn(
              'mt-4 inline-flex h-9 items-center rounded-lg border border-red-300/80 bg-white px-3 text-sm font-semibold text-red-900',
              'transition hover:bg-red-100/80 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100 dark:hover:bg-red-900/40',
            )}
            onClick={() => {
              void refetch()
            }}
          >
            Try again
          </button>
        </div>
      )}

      {showSkeleton && <HistorySkeleton />}

      {!showSkeleton && !isError && rows.length === 0 && total === 0 && (
        <div
          className={cn(
            'mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-zinc-300/90 bg-zinc-50/50 px-6 py-12 text-center',
            'dark:border-zinc-700 dark:bg-zinc-900/30',
          )}
        >
          <div
            className={cn(
              'flex size-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80',
              'dark:bg-zinc-950 dark:ring-zinc-800',
            )}
            aria-hidden
          >
            <History className="size-7 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
          </div>
          <h2 className="mt-5 font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
            No history yet
          </h2>
          <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            When you finish a translation, it will show up here so you can open it again or
            download the file.
          </p>
          <Link
            to="/app/upload"
            className={cn(appPagePrimaryCtaClass, 'mt-6 min-h-[44px] px-5 sm:min-h-10')}
          >
            Start a translation
          </Link>
        </div>
      )}

      {!showSkeleton && !isError && rows.length === 0 && total > 0 && (
        <>
          <div
            className={cn(
              'rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40',
            )}
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Nothing on this page.</p>
            <button
              type="button"
              className={cn(
                'mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-600',
                'hover:underline dark:text-brand-400 sm:min-h-10',
              )}
              onClick={() => setPage(1)}
            >
              Go to first page
            </button>
          </div>
          <HistoryPagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            isBusy={pageIsLoading}
            onPageChange={setPage}
          />
        </>
      )}

      {!showSkeleton && rows.length > 0 && (
        <>
          <ul
            className={cn(
              'space-y-3 transition-opacity duration-200',
              pageIsLoading && 'pointer-events-none opacity-50',
            )}
            aria-busy={pageIsLoading}
          >
            {rows.map((r) => (
              <HistoryRow key={r.id} row={r} />
            ))}
          </ul>

          <HistoryPagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            isBusy={pageIsLoading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
