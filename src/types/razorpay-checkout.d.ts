/** Loaded from https://checkout.razorpay.com/v1/checkout.js */

export type RazorpayHandlerResponse = {
  razorpay_payment_id?: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature?: string
}

export type RazorpayConstructor = new (options: {
  key: string
  /** Subscription checkout */
  subscription_id?: string
  /** Order checkout (one-time wallet top-up) */
  order_id?: string
  amount?: number
  currency?: string
  name: string
  description?: string
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
  readonly?: boolean
}) => {
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor
  }
}

export {}
