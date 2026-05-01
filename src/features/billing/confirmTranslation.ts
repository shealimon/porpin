import axios from 'axios'
import toast from 'react-hot-toast'

import { confirmMilestoneJobSafe } from '@/features/jobs/api'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'

export type ConfirmTranslationArgs = {
  jobId: string
  words: number
  /** Pay-as-you-go INR actually due for this job (after free / subscription words). */
  amountToPay: number
  fileName?: string
  /** Output: Roman Hinglish vs Devanagari Hindi (sent on confirm). */
  translationTarget?: 'hinglish' | 'hindi'
}

export async function confirmTranslationJob(args: ConfirmTranslationArgs): Promise<void> {
  const { jobId, translationTarget = 'hinglish' } = args

  let result: Awaited<ReturnType<typeof confirmMilestoneJobSafe>>
  try {
    result = await confirmMilestoneJobSafe(jobId, translationTarget)
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 402) {
      const d = e.response.data as { detail?: string } | undefined
      const msg = typeof d?.detail === 'string' ? d.detail : 'Not enough pay-as-you-go credit for this job.'
      toast.error(msg)
    }
    throw e
  }

  if (result === 'already_started') {
    void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
    void refreshProfileExtras()
    return
  }

  if (result.awaiting_payment) {
    void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
    void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
    return
  }

  void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
  void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
  void refreshProfileExtras()
}
