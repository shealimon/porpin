/** Labels for pipeline stages (backend may only emit a subset today). */
export const JOB_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_estimate: 'Pending estimate',
  estimated: 'Estimated',
  preview_ready: 'Preview ready',
  queued: 'Queued',
  processing: 'Processing',
  parsing_document: 'Reading document',
  stitching: 'Stitching',
  generating_file: 'Generating file',
  completed: 'Completed',
  failed: 'Failed',
}

export function jobStatusLabel(status: string): string {
  const key = status.toLowerCase().replace(/\s+/g, '_')
  return JOB_STATUS_LABEL[key] ?? status.replace(/_/g, ' ')
}
