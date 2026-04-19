import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js'

import type { AuthUser } from '@/stores/authStore'

function trimStr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t || undefined
}

function namesFromMetadata(
  meta: Record<string, unknown> | undefined,
): { firstName?: string; lastName?: string } {
  if (!meta) return {}
  let first = trimStr(meta.first_name)
  let last = trimStr(meta.last_name)
  if (first || last) return { firstName: first, lastName: last }
  const full = trimStr(meta.full_name)
  if (!full) return {}
  const i = full.indexOf(' ')
  if (i === -1) return { firstName: full }
  return {
    firstName: full.slice(0, i),
    lastName: full.slice(i + 1).trim() || undefined,
  }
}

const AVATAR_URL_KEYS = [
  'avatar_url',
  'picture',
  'image',
  'avatarUrl',
  'photo_url',
  'picture_url',
] as const

function avatarFromRecord(r: Record<string, unknown> | undefined): string | undefined {
  if (!r) return undefined
  for (const k of AVATAR_URL_KEYS) {
    const v = trimStr(r[k])
    if (v) return v
  }
  return undefined
}

function avatarFromIdentities(u: SupabaseUser): string | undefined {
  for (const row of u.identities ?? []) {
    const d = row.identity_data as Record<string, unknown> | undefined
    const url = avatarFromRecord(d)
    if (url) return url
  }
  return undefined
}

function avatarFromUser(u: SupabaseUser): string | undefined {
  const meta = u.user_metadata as Record<string, unknown> | undefined
  return avatarFromRecord(meta) ?? avatarFromIdentities(u)
}

/** Load full user (OAuth `identities`, avatars) via Auth API; local session user is often incomplete. */
export async function resolveAuthUser(
  client: SupabaseClient,
  fallback: SupabaseUser,
): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return fallback
  return data.user
}

export function supabaseUserToAuthUser(u: SupabaseUser): AuthUser {
  const meta = u.user_metadata as Record<string, unknown> | undefined
  const { firstName, lastName } = namesFromMetadata(meta)
  const avatarUrl = avatarFromUser(u)
  return {
    id: u.id,
    email: u.email ?? '',
    firstName,
    lastName,
    avatarUrl,
  }
}
