import axios from 'axios'
import toast from 'react-hot-toast'

import { confirmMilestoneJobSafe } from '@/features/jobs/api'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { useBillingStore } from '@/stores/billingStore'

export type ConfirmTranslationArgs = {
  jobId: string
  words: number
  /** Pay-as-you-go INR actually due for this job (after free / subscription words). */
  amountToPay: number
  fileName?: string
  /** Source language for the translation pipeline (stored on confirm). */
  inputLang?: 'en' | 'hi'
}

export async function confirmTranslationJob(args: ConfirmTranslationArgs): Promise<void> {
  const { jobId, words, amountToPay, fileName, inputLang = 'en' } = args
  const billing = useBillingStore.getState()

  try {
    const didPost = await confirmMilestoneJobSafe(jobId, inputLang)
    if (!didPost) {
      void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
      void queryClient.invalidateQueries({ queryKey: qk.jobs.detail(jobId) })
      void refreshProfileExtras()
      return
    }
  } catch (e: unknown) {
    if (axios.isAxiosError(e) && e.response?.status === 402) {
      const d = e.response.data as { detail?: string } | undefined
      const msg = typeof d?.detail === 'string' ? d.detail : 'Not enough pay-as-you-go credit for this job.'
      toast.error(msg)
    }
    throw e
  }
  void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
  void refreshProfileExtras()
  billing.addTransaction({
    jobId,
    fileName,
    words,
    amountInr: amountToPay,
    status: 'succeeded',
    kind: amountToPay > 0 ? 'payg_demo' : 'included_words',
  })
}

