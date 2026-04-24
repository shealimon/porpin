import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Where the next auth session write goes; read merges both storages. */
const AUTH_SESSION_WRITE_TARGET_KEY = 'porpin-auth-session-write-target'

/** Shown in auth UI when Vite has no Supabase env (or dev server not restarted after editing `.env`). */
export const supabaseConfigMissingUserMessage =
  'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart the dev server (Vite only loads these at startup).'

function readEnv(): { url: string | undefined; anon: string | undefined } {
  return {
    url: import.meta.env.VITE_SUPABASE_URL?.trim(),
    anon: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim(),
  }
}

function getAuthSessionWriteTarget(): 'local' | 'session' {
  try {
    if (localStorage.getItem(AUTH_SESSION_WRITE_TARGET_KEY) === 'session') return 'session'
  } catch {
    /* private mode */
  }
  return 'local'
}

/**
 * Call immediately before `signInWithPassword` so the session is stored in localStorage
 * (stay signed in) or sessionStorage (forgotten when the browser session ends).
 */
export function setAuthRememberMe(rememberMe: boolean): void {
  try {
    if (rememberMe) localStorage.removeItem(AUTH_SESSION_WRITE_TARGET_KEY)
    else localStorage.setItem(AUTH_SESSION_WRITE_TARGET_KEY, 'session')
  } catch {
    /* private mode */
  }
}

export function clearAuthRememberMePreference(): void {
  try {
    localStorage.removeItem(AUTH_SESSION_WRITE_TARGET_KEY)
  } catch {
    /* private mode */
  }
}

function createAuthStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  return {
    getItem(key: string) {
      try {
        return localStorage.getItem(key) ?? sessionStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem(key: string, value: string) {
      try {
        if (getAuthSessionWriteTarget() === 'session') {
          sessionStorage.setItem(key, value)
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, value)
          sessionStorage.removeItem(key)
        }
      } catch {
        /* private mode */
      }
    },
    removeItem(key: string) {
      try {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch {
        /* private mode */
      }
    },
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
    throw new Error(supabaseConfigMissingUserMessage)
  }
  if (!_client) {
    _client = createClient(url, anon, {
      auth: {
        storage: createAuthStorage(),
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
