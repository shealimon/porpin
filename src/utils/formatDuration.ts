/** Human-readable duration from a number of seconds (e.g. translation wall time). */
export function formatDurationSeconds(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '—'
  if (total < 60) {
    const s = total < 10 ? total.toFixed(1) : Math.round(total).toString()
    return `${s}s`
  }
  const m = Math.floor(total / 60)
  const s = Math.round(total % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`
  }
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
