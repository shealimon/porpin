import axios from 'axios'
import toast from 'react-hot-toast'

import { createRazorpayWalletOrder, verifyRazorpayWalletTopup } from '@/api/billing'
import { loadRazorpayScript } from '@/lib/razorpayScript'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'

function formatInrBrief(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Opens Razorpay Checkout for a one-time PAYG payment (amount is credited server-side for settlement).
 * @returns true if payment verified and account credited
 */
export async function runRazorpayWalletTopup(amountInr: number, description?: string): Promise<boolean> {
  const rounded = Math.max(1, Math.round(amountInr * 100) / 100)
  let order: Awaited<ReturnType<typeof createRazorpayWalletOrder>>
  try {
    await loadRazorpayScript()
    order = await createRazorpayWalletOrder(rounded)
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const d = (e.response?.data as { detail?: string } | undefined)?.detail
      const msg =
        typeof d === 'string'
          ? d
          : e.response?.status === 503
            ? 'Payments not configured. For local dev set PAYG_WALLET_REQUIRED=false in backend .env.'
            : 'Could not start checkout.'
      toast.error(msg)
    } else {
      toast.error(e instanceof Error ? e.message : 'Could not start checkout.')
    }
    return false
  }

  const Ctor = window.Razorpay
  if (!Ctor) {
    toast.error('Razorpay SDK missing after load.')
    return false
  }

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      resolve(ok)
    }

    const rzp = new Ctor({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency,
      order_id: order.order_id,
      name: 'Porpin',
      description: description ?? `Pay-as-you-go · ${formatInrBrief(order.amount_inr)}`,
      handler: (response) => {
        const orderId = response.razorpay_order_id
        const payId = response.razorpay_payment_id
        const sig = response.razorpay_signature
        if (!orderId || !payId || !sig) {
          toast.error('Payment response incomplete.')
          finish(false)
          return
        }
        void verifyRazorpayWalletTopup({
          razorpay_order_id: orderId,
          razorpay_payment_id: payId,
          razorpay_signature: sig,
        })
          .then(() => {
            void refreshProfileExtras()
            toast.success(`Paid ${formatInrBrief(order.amount_inr)}`)
            finish(true)
          })
          .catch((err: unknown) => {
            if (axios.isAxiosError(err)) {
              const d = (err.response?.data as { detail?: string } | undefined)?.detail
              toast.error(typeof d === 'string' ? d : 'Could not verify payment.')
            } else {
              toast.error('Could not verify payment.')
            }
            finish(false)
          })
      },
      modal: {
        ondismiss() {
          void refreshProfileExtras()
          finish(false)
        },
      },
    })
    rzp.open()
  })
}
