import { backendClient } from '@/api/backendClient'

export type RazorpaySubscriptionStart = {
  subscription_id: string
  key_id: string
  plan_id: string
}

export type RazorpayPaygJobOrder = {
  order_id: string
  key_id: string
  amount_inr: number
  amount_paise: number
  currency: string
  job_id: string
}

export type RazorpayVerifyCapturedBody = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type RazorpayVerifyCapturedResult = {
  ok: boolean
  credited_inr: number
  already_applied: boolean
  kind: string
  job_activated: boolean
  job_id: string | null
}

export function createRazorpaySubscription(
  kind: 'monthly' | 'yearly' = 'monthly',
): Promise<RazorpaySubscriptionStart> {
  return backendClient
    .post<RazorpaySubscriptionStart>(
      '/api/billing/razorpay/create-subscription',
      { kind },
    )
    .then((r) => r.data)
}

/** After Checkout success: persist plan + credits (webhooks may not hit localhost). */
export function syncRazorpaySubscriptionAfterCheckout(): Promise<{
  ok: boolean
  plan: string
  subscription_active: boolean
}> {
  return backendClient
    .post<{
      ok: boolean
      plan: string
      subscription_active: boolean
    }>('/api/billing/razorpay/sync-subscription-after-checkout')
    .then((r) => r.data)
}

/** Razorpay order for a job in ``awaiting_payment`` (per-job PAYG). */
export function createRazorpayPaygJobOrder(
  jobId: string,
): Promise<RazorpayPaygJobOrder> {
  return backendClient
    .post<RazorpayPaygJobOrder>('/api/billing/razorpay/create-payg-translation-order', {
      job_id: jobId,
    })
    .then((r) => r.data)
}

export function verifyRazorpayCapturedPayment(
  body: RazorpayVerifyCapturedBody,
): Promise<RazorpayVerifyCapturedResult> {
  return backendClient
    .post<RazorpayVerifyCapturedResult>(
      '/api/billing/razorpay/verify-captured-payment',
      body,
    )
    .then((r) => r.data)
}
