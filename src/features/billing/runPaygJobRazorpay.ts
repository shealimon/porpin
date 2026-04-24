import toast from 'react-hot-toast'

import {
  createRazorpayPaygJobOrder,
  verifyRazorpayCapturedPayment,
} from '@/api/billing'
import { loadRazorpayScript } from '@/lib/razorpayScript'
import type { RazorpayHandlerResponse } from '@/types/razorpay-checkout'

const APP_NAME = 'Porpin'

export type RunPaygJobRazorpayArgs = {
  jobId: string
  fileName?: string
  /** Shown in Razorpay modal */
  description?: string
}

/**
 * Open Razorpay Standard Checkout for a per-job order (job must be `awaiting_payment`).
 * @returns true if payment was verified; false if user closed the modal or payment failed.
 */
export async function runPaygJobRazorpayCheckout(
  args: RunPaygJobRazorpayArgs,
): Promise<boolean> {
  const { jobId, fileName, description } = args
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined
  if (!key?.trim()) {
    toast.error('Payments are not configured (set VITE_RAZORPAY_KEY_ID in the app env).')
    return false
  }

  let order: Awaited<ReturnType<typeof createRazorpayPaygJobOrder>>
  try {
    await loadRazorpayScript()
    order = await createRazorpayPaygJobOrder(jobId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not start payment.'
    toast.error(
      /not configured|503|5\d\d/i.test(msg)
        ? 'Payment service is not available. Try again later.'
        : msg,
    )
    return false
  }

  const Ctor = window.Razorpay
  if (typeof Ctor !== 'function') {
    toast.error('Razorpay checkout did not load.')
    return false
  }

  return new Promise((resolve) => {
    let settled = false
    let userIsPaying = false
    const finish = (v: boolean) => {
      if (settled) return
      settled = true
      resolve(v)
    }

    const rzp = new Ctor({
      key,
      order_id: order.order_id,
      amount: order.amount_paise,
      currency: order.currency,
      name: APP_NAME,
      description:
        description ?? `Translation${fileName ? ` · ${fileName}` : ''}`,
      handler: async (response: RazorpayHandlerResponse) => {
        userIsPaying = true
        const orderId = response.razorpay_order_id
        const payId = response.razorpay_payment_id
        const sig = response.razorpay_signature
        if (!orderId || !payId || !sig) {
          toast.error('Invalid payment response from gateway.')
          userIsPaying = false
          finish(false)
          return
        }
        try {
          await verifyRazorpayCapturedPayment({
            razorpay_order_id: orderId,
            razorpay_payment_id: payId,
            razorpay_signature: sig,
          })
          finish(true)
        } catch {
          toast.error('Could not verify payment. If you were charged, contact support with your payment id.')
          finish(false)
        } finally {
          userIsPaying = false
        }
      },
      modal: {
        ondismiss: () => {
          if (userIsPaying) return
          if (!settled) finish(false)
        },
      },
    })
    rzp.on(
      'payment.failed',
      (r: { error?: { description?: string; code?: string } }) => {
        const d = r?.error?.description ?? 'Payment failed.'
        toast.error(d)
        finish(false)
      },
    )
    rzp.open()
  })
}
