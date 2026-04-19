import { useQuery } from '@tanstack/react-query'

import { fetchPublicPricingConfig } from '@/api/pricing'
import { mergePricingConfig, type PublicPricingConfig } from '@/lib/pricingConfig'
import { qk } from '@/lib/queryKeys'

export type UsePricingConfigOptions = {
  /**
   * When false, skip GET /api/pricing/config and use `mergePricingConfig(undefined)`
   * (defaults + `VITE_*` env overrides). Use on the public landing section so the
   * marketing page does not depend on the API.
   */
  fetchRemote?: boolean
}

export function usePricingConfig(options?: UsePricingConfigOptions): {
  pricing: PublicPricingConfig
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
} {
  const fetchRemote = options?.fetchRemote ?? true
  const query = useQuery({
    queryKey: qk.pricing.config(),
    enabled: fetchRemote,
    queryFn: ({ signal }) => fetchPublicPricingConfig(signal),
    staleTime: 60_000,
    /** Strict Mode remount can cancel the first fetch; retries help a cold backend too. */
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    select: (data) => mergePricingConfig(data),
  })
  return {
    pricing: query.data ?? mergePricingConfig(undefined),
    isLoading: fetchRemote && query.isLoading,
    isError: fetchRemote && query.isError,
    error: fetchRemote ? (query.error as Error | null) : null,
    refetch: fetchRemote
      ? () => {
          void query.refetch()
        }
      : () => {},
  }
}
