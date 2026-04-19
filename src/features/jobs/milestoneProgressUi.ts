import type { MilestoneJob } from '@/features/jobs/api'

/** Progress label + bar width for milestone job detail (job progress page + dashboard). */
export function resolveMilestoneProgressUi(job: MilestoneJob | undefined): {
  label: string
  fill: number
} {
  if (!job) {
    return { label: 'Loading…', fill: 6 }
  }
  const st = job.status.toLowerCase().replace(/\s+/g, '_')
  const p = job.progressPercent ?? 0

  if (st === 'queued') {
    return { label: 'Queued…', fill: Math.max(p, 10) }
  }
  if (st === 'processing') {
    const fill = p > 0 ? p : 8
    // Backend advances during OpenAI chunk work (formerly looked stuck at 30%).
    const label = p >= 22 ? `Translating… ${p}%` : `Processing… ${p}%`
    return { label, fill }
  }
  if (st === 'stitching') {
    return { label: 'Stitching…', fill: Math.max(p, 20) }
  }
  if (st === 'generating_file' || st === 'generating file') {
    return { label: 'Generating file…', fill: Math.max(p, 85) }
  }
  return { label: `${p}%`, fill: p }
}
