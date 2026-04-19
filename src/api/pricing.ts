import { backendClient } from '@/api/backendClient'
import type { PublicPricingConfig } from '@/lib/pricingConfig'

export async function fetchPublicPricingConfig(signal?: AbortSignal): Promise<PublicPricingConfig> {
  const { data } = await backendClient.get<PublicPricingConfig>('/api/pricing/config', { signal })
  return data
}
