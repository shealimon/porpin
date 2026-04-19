import toast from 'react-hot-toast'

import { apiClient } from '@/api/client'
import { isApiRequestError } from '@/api/axiosError'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import {
  applySyncProfileResponse,
  type SyncProfileResponse,
} from '@/lib/syncBackendProfile'
import { useAuthStore } from '@/stores/authStore'

/** Successful API sync: updates billing extras + returns payload for the Account form. */
export async function loadAccountProfileFromApi(): Promise<SyncProfileResponse> {
  const { data } = await apiClient.post<SyncProfileResponse>('/me/sync-profile', undefined, {
    timeout: 45_000,
  })
  applySyncProfileResponse(data)
  return data
}

async function readSupabaseMetaFields(): Promise<{
  first_name: string
  last_name: string
  mobile: string
  city: string
  country: string
} | null> {
  if (!isSupabaseConfigured()) return null
  const { data: sessionWrap } = await supabase.auth.getSession()
  const m = sessionWrap.session?.user?.user_metadata as Record<string, unknown> | undefined
  if (!m) return null
  const pick = (k: string) => (typeof m[k] === 'string' ? (m[k] as string).trim() : '')
  const authU = useAuthStore.getState().user
  return {
    first_name: pick('first_name') || authU?.firstName || '',
    last_name: pick('last_name') || authU?.lastName || '',
    mobile: pick('mobile'),
    city: pick('city'),
    country: pick('country'),
  }
}

/** Build profile payload for the form without touching billing extras (API unavailable). */
function fallbackProfilePayload(fields: {
  first_name: string
  last_name: string
  mobile: string
  city: string
  country: string
}): SyncProfileResponse {
  const authU = useAuthStore.getState().user!
  return {
    id: authU.id,
    email: authU.email ?? null,
    plan: 'free',
    first_name: fields.first_name || null,
    last_name: fields.last_name || null,
    mobile: fields.mobile || null,
    city: fields.city || null,
    country: fields.country || null,
  }
}

/**
 * Loads profile for Account page. On API failure, may recover name/location from Supabase metadata.
 * Fallback payloads do not call `applySyncProfileResponse` (avoids wiping billing extras).
 */
export async function loadAccountProfileForQuery(): Promise<SyncProfileResponse> {
  try {
    return await loadAccountProfileFromApi()
  } catch (e) {
    const recoverFromMeta = async (): Promise<SyncProfileResponse | null> => {
      const fields = await readSupabaseMetaFields()
      if (!fields) return null
      return fallbackProfilePayload(fields)
    }

    if (isApiRequestError(e)) {
      if (e.status === 401) {
        const detail = e.message && e.message !== 'Request failed' ? e.message : null
        toast.error(
          detail
            ? `Could not load your profile: ${detail} Try signing out and back in. If it keeps happening, set backend SUPABASE_JWT_SECRET to the JWT Secret from Supabase (Project Settings → API).`
            : 'Could not load your profile. Sign out and sign in again. If it persists, verify backend SUPABASE_JWT_SECRET matches your Supabase project.',
          { duration: 7500 },
        )
        throw e
      }
      if (e.status === 503) {
        const recovered = await recoverFromMeta()
        if (recovered) {
          toast.success(
            'Loaded profile from your sign-in. Set SUPABASE_DATABASE_URL on the API for server billing data.',
            { duration: 6000 },
          )
          return recovered
        }
        toast.error(
          'The API could not load your profile (database or configuration). Check the backend logs.',
        )
        throw e
      }
      if (e.status === 502 || e.status === 504) {
        const recovered = await recoverFromMeta()
        if (recovered) {
          toast.success(
            'Loaded profile from your sign-in. Start the API on port 8000 (e.g. npm run dev in frontend) for billing sync.',
            { duration: 6500 },
          )
          return recovered
        }
        toast.error(
          'Could not reach the API (bad gateway). Start the backend on port 8000—use npm run dev from the frontend folder so Vite and the API run together—or fix your reverse proxy upstream.',
          { duration: 9000 },
        )
        throw e
      }
      if (e.status == null) {
        const recovered = await recoverFromMeta()
        if (recovered) return recovered
        toast.error(
          'Could not reach the API. Start the backend (port 8000) and open the app via the Vite dev server, or set VITE_BACKEND_ORIGIN in frontend/.env.',
        )
        throw e
      }
      toast.error(`Could not load your profile: ${e.message}`)
      throw e
    }

    toast.error('Could not load your profile. Check that the API is running.')
    const lastChance = await recoverFromMeta()
    if (lastChance) return lastChance
    throw e
  }
}
