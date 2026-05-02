import { backendClient } from '@/api/backendClient'
import { apiUrl } from '@/config/api.js'
import type { PublicPricingConfig } from '@/lib/pricingConfig'

export async function fetchPublicPricingConfig(signal?: AbortSignal): Promise<PublicPricingConfig> {
  const { data } = await backendClient.get<PublicPricingConfig>(apiUrl('/api/pricing/config'), { signal })
  return data
}
