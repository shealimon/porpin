import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readEnv(): { url: string | undefined; anon: string | undefined } {
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim(),
    anon: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  }
}

let _client: SupabaseClient | null = null

function getOrCreateClient(): SupabaseClient {
  const { url, anon } = readEnv()
  if (!url || !anon) {
    // eslint-disable-next-line no-console -- dev configuration hint
    console.warn(
      '[auth] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Copy them from Supabase → Project Settings → API, save as frontend/.env, and restart Vite.',
    )
    throw new Error(
      'Supabase env is missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env',
    )
  }
  if (!_client) {
    _client = createClient(url, anon, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return _client
}

/**
 * Supabase browser client (anon key). Lazily created so a missing .env does not crash the app on import.
 * Always guard with `isSupabaseConfigured()` or try/catch before calling auth methods.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getOrCreateClient()
    const value = Reflect.get(client, prop, receiver) as unknown
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

export function isSupabaseConfigured(): boolean {
  const { url, anon } = readEnv()
  return Boolean(url && anon)
}
