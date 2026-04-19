export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB'] as const
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const n = bytes / k ** i
  return `${n.toFixed(decimals)} ${sizes[i]}`
}

export function formatCurrency(
  amountCents: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}

export function formatDate(iso: string, locale?: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

export function formatPercent(value: number): string {
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`
}
