import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

export type AppTablePaginationProps = {
  page: number
  totalItems: number
  pageSize: number
  onPageChange: (nextPage: number) => void
  className?: string
}

export function AppTablePagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: AppTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)

  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)
  const rangeText =
    totalItems === 0
      ? 'No entries'
      : `Showing ${start.toLocaleString('en-IN')}–${end.toLocaleString('en-IN')} of ${totalItems.toLocaleString('en-IN')}`

  const showNav = totalPages > 1

  return (
    <div
      className={cn(
        'mt-5 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{rangeText}</p>

      {showNav ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="flex min-w-[5.5rem] items-center justify-center px-2 text-sm tabular-nums text-muted-foreground">
                {safePage} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                disabled={safePage >= totalPages}
                onClick={() => onPageChange(safePage + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}
