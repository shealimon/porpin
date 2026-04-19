import { backendClient } from '@/api/backendClient'

export type RazorpaySubscriptionStart = {
  subscription_id: string
  key_id: string
  plan_id: string
}

export type RazorpayWalletOrder = {
  order_id: string
  key_id: string
  amount_inr: number
  amount_paise: number
  currency: string
}

export type RazorpayWalletHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export function createRazorpaySubscription(): Promise<RazorpaySubscriptionStart> {
  return backendClient
    .post<RazorpaySubscriptionStart>('/api/billing/razorpay/create-subscription')
    .then((r) => r.data)
}

export function createRazorpayWalletOrder(amountInr: number): Promise<RazorpayWalletOrder> {
  return backendClient
    .post<RazorpayWalletOrder>('/api/billing/razorpay/create-wallet-order', {
      amount_inr: amountInr,
    })
    .then((r) => r.data)
}

export function verifyRazorpayWalletTopup(
  body: RazorpayWalletHandlerResponse,
): Promise<{ ok: boolean; credited_inr: number; already_applied: boolean }> {
  return backendClient
    .post('/api/billing/razorpay/verify-wallet-topup', body)
    .then((r) => r.data)
}
