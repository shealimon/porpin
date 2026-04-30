import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Mail, Save, User } from 'lucide-react'
import toast from 'react-hot-toast'

import { apiClient } from '@/api/client'
import { fieldControlInputCompactClassName, Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loadAccountProfileForQuery } from '@/lib/accountProfileLoad'
import { qk } from '@/lib/queryKeys'
import {
  applySyncProfileResponse,
  type SyncProfileResponse,
} from '@/lib/syncBackendProfile'
import { supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import {
  appPageDescriptionClass,
  appPageHeaderClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { IN_CODE_LABEL, IN_DIAL, formatInMobileForApi, parseInMobileToLocal } from '@/lib/phoneCountryCodes'
import { displayNameFromNameParts, setStoredUserName } from '@/utils/greeting'

function SectionCard({
  children,
  className,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-zinc-200/90 bg-white shadow-sm',
        'dark:border-zinc-800 dark:bg-zinc-950/80',
        'p-5 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

function ProfileField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="text-zinc-700 dark:text-zinc-300">
        {label}
      </Label>
      {children}
    </div>
  )
}

function ProfileFieldSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-200/90 dark:bg-zinc-800/90" />
    </div>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const authHydrated = useAuthStore((s) => s.authHydrated)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)

  const userId = user?.id ?? ''
  const canFetchProfile = Boolean(authHydrated && userId && accessToken)

  const profileQuery = useQuery({
    queryKey: qk.me.syncProfile(userId || '__'),
    queryFn: loadAccountProfileForQuery,
    enabled: canFetchProfile,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
  })

  const [saving, setSaving] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobileLocal, setMobileLocal] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('India')

  useEffect(() => {
    const d = profileQuery.data
    if (d) {
      setFirstName(d.first_name ?? '')
      setLastName(d.last_name ?? '')
      setMobileLocal(parseInMobileToLocal(d.mobile))
      setCity(d.city ?? '')
      setCountry((d.country ?? '').trim() || 'India')
      return
    }
    setFirstName(user?.firstName ?? '')
    setLastName(user?.lastName ?? '')
  }, [profileQuery.data, user?.firstName, user?.lastName])

  const showProfileSkeleton = canFetchProfile && profileQuery.isPending && !profileQuery.data

  const onSaveProfile = async () => {
    setSaving(true)
    try {
      const fn = firstName.trim()
      const ln = lastName.trim()
      const mob = formatInMobileForApi(mobileLocal).trim() || null
      const cty = city.trim()
      const ctry = country.trim() || 'India'
      const body = {
        first_name: fn || null,
        last_name: ln || null,
        mobile: mob,
        city: cty || null,
        country: ctry,
      }

      const { data } = await apiClient.patch<SyncProfileResponse>('/me/profile', body)
      applySyncProfileResponse(data)
      if (userId) {
        queryClient.setQueryData(qk.me.syncProfile(userId || '__'), data)
      }

      if (isSupabaseConfigured()) {
        const { data: supaData, error } = await supabase.auth.updateUser({
          data: {
            first_name: fn || null,
            last_name: ln || null,
            mobile: mob || null,
            city: cty || null,
            country: ctry || null,
          },
        })
        if (error) {
          toast.error(
            `${error.message ?? 'Could not sync to your sign-in session.'} The app may still have saved a copy on the server.`,
            { duration: 7000 },
          )
        } else {
          const { data: sessionWrap } = await supabase.auth.getSession()
          const token = sessionWrap.session?.access_token
          const u = supaData.user ?? sessionWrap.session?.user
          if (token && u) {
            setSession(token, supabaseUserToAuthUser(u))
          }
          toast.success('Profile saved')
        }
      } else {
        toast.success('Profile saved')
      }

      const display = displayNameFromNameParts(fn, ln) || fn
      if (display) setStoredUserName(display)
      else setStoredUserName('')
    } catch {
      toast.error('Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(appPageShellClass, 'space-y-8 sm:space-y-10')}>
      <header className={appPageHeaderClass}>
        <h1 className={appPageTitleClass}>Account</h1>
        <p className={appPageDescriptionClass}>
          Keep your profile details up to date for a faster, personalized experience.
        </p>
      </header>

      <SectionCard aria-labelledby="profile-heading">
        <div className="border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="profile-heading"
                className="flex items-center gap-2 font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
              >
                <User className="size-5 shrink-0 text-brand-600 dark:text-brand-400" aria-hidden />
                Profile
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Saved to your account. Name fields sync with your sign-in when possible.
              </p>
            </div>
            <span
              className={cn(
                'inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium',
                'border-emerald-200 bg-emerald-50 text-emerald-700',
                'dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
              )}
            >
              Secure profile
            </span>
          </div>

          {user?.email ? (
            <div
              className={cn(
                'mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-2.5 text-sm',
                'dark:border-zinc-800 dark:bg-zinc-900/50',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-lg border',
                  'border-brand-200/80 bg-brand-50/90 dark:border-brand-500/30 dark:bg-brand-950/50',
                )}
                aria-hidden
              >
                <Mail className="size-[0.9rem] text-brand-600 dark:text-brand-400" />
              </span>
              <p className="min-w-0 py-0.5 leading-snug">
                <span className="text-zinc-500 dark:text-zinc-400">Signed in as </span>
                <span className="break-all font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>
              </p>
            </div>
          ) : null}
        </div>

        {profileQuery.isError && canFetchProfile ? (
          <div
            className="mt-5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100"
            role="alert"
          >
            <p className="font-medium">Profile could not be loaded</p>
            <button
              type="button"
              className="mt-2 font-semibold text-red-800 underline underline-offset-2 dark:text-red-200"
              onClick={() => void profileQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : null}

        {showProfileSkeleton ? (
          <div className="mt-6 space-y-5" aria-busy>
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="size-4 animate-spin text-brand-600 dark:text-brand-400" aria-hidden />
              Loading profile…
            </div>
            <ProfileFieldSkeleton />
            <ProfileFieldSkeleton />
            <div className="grid gap-5 sm:grid-cols-2">
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4">
              <ProfileField id="profile-first" label="First name">
                <Input
                  id="profile-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="First name"
                />
              </ProfileField>
              <ProfileField id="profile-last" label="Last name">
                <Input
                  id="profile-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="Last name"
                />
              </ProfileField>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300" id="profile-mobile-group">
                Mobile
              </div>
              <div
                className="flex min-w-0 items-stretch gap-2"
                role="group"
                aria-labelledby="profile-mobile-group"
              >
                <div
                  className={cn(
                    'flex h-9 min-h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-zinc-300 px-2 text-xs tabular-nums leading-none',
                    'text-zinc-600 dark:border-zinc-600 dark:text-zinc-300',
                  )}
                  title={`${IN_CODE_LABEL} ${IN_DIAL}`}
                  aria-hidden
                >
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">{IN_CODE_LABEL}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{IN_DIAL}</span>
                </div>
                <Input
                  id="profile-mobile-local"
                  value={mobileLocal}
                  onChange={(e) => setMobileLocal(e.target.value.replace(/\D/g, ''))}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  className={cn(fieldControlInputCompactClassName, 'min-w-0 flex-1')}
                  placeholder="10-digit number"
                  aria-label="Mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <ProfileField id="profile-city" label="City">
                <Input
                  id="profile-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  className={fieldControlInputCompactClassName}
                  placeholder="City"
                />
              </ProfileField>
              <ProfileField id="profile-country" label="Country">
                <Input
                  id="profile-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  autoComplete="country-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="Country"
                />
              </ProfileField>
            </div>

            <div className="sticky bottom-0 -mx-5 border-t border-zinc-100 bg-white/95 px-5 pb-1 pt-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/90 dark:supports-[backdrop-filter]:bg-zinc-950/70 sm:static sm:mx-0 sm:flex sm:justify-center sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 sm:backdrop-blur-0">
              <button
                type="button"
                onClick={() => void onSaveProfile()}
                disabled={saving}
                className={cn(
                  'inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-0 px-5',
                  'text-sm font-semibold text-white',
                  'bg-emerald-600 shadow-md shadow-black/10',
                  'transition hover:bg-emerald-700 hover:shadow-lg hover:shadow-black/15 active:scale-[0.98]',
                  'dark:bg-emerald-500 dark:hover:bg-emerald-400',
                  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400/50 dark:focus-visible:outline-zinc-500/50',
                  'disabled:pointer-events-none disabled:opacity-60',
                  'sm:min-w-[8.5rem] sm:w-auto',
                )}
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  <>
                    <Save className="size-4 shrink-0" aria-hidden />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
