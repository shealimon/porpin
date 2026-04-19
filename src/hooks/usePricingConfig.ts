import { useQuery } from '@tanstack/react-query'

import { fetchPublicPricingConfig } from '@/api/pricing'
import { mergePricingConfig, type PublicPricingConfig } from '@/lib/pricingConfig'
import { qk } from '@/lib/queryKeys'

export function usePricingConfig(): {
  pricing: PublicPricingConfig
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const query = useQuery({
    queryKey: qk.pricing.config(),
    queryFn: fetchPublicPricingConfig,
    staleTime: 60_000,
    select: (data) => mergePricingConfig(data),
  })
  return {
    pricing: query.data ?? mergePricingConfig(undefined),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: () => {
      void query.refetch()
    },
  }
}
