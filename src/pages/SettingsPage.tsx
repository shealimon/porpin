import { useEffect, useState, type ComponentProps } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/button'
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
import { useAuthStore, type UploadTier } from '@/stores/authStore'
import {
  appPageHeaderClass,
  appPagePrimaryCtaClass,
  appPageShellClass,
  appPageTitleClass,
} from '@/lib/appPageLayout'
import { cn } from '@/lib/utils'
import { displayNameFromNameParts, setStoredUserName } from '@/utils/greeting'

const tierOptions: { tier: UploadTier; title: string; hint: string }[] = [
  { tier: 'trial', title: 'Standard', hint: 'Server applies free & subscription words first' },
  { tier: 'payg', title: 'Pay-as-you-go emphasis', hint: 'Upload shows estimate, amount, and PAYG confirmation' },
]

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
  const uploadTier = useAuthStore((s) => s.uploadTier)
  const setUploadTier = useAuthStore((s) => s.setUploadTier)
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
  const [mobile, setMobile] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    const d = profileQuery.data
    if (d) {
      setFirstName(d.first_name ?? '')
      setLastName(d.last_name ?? '')
      setMobile(d.mobile ?? '')
      setCity(d.city ?? '')
      setCountry(d.country ?? '')
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
      const mob = mobile.trim()
      const cty = city.trim()
      const ctry = country.trim()
      const body = {
        first_name: fn || null,
        last_name: ln || null,
        mobile: mob || null,
        city: cty || null,
        country: ctry || null,
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
      </header>

      <SectionCard aria-labelledby="profile-heading">
        <div className="border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <h2
            id="profile-heading"
            className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Profile
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Saved to your account. Name fields sync with your sign-in when possible.
          </p>
        </div>

        {user?.email ? (
          <div
            className={cn(
              'mt-5 rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-4 py-3 text-sm',
              'dark:border-zinc-800 dark:bg-zinc-900/50',
            )}
          >
            <span className="text-zinc-500 dark:text-zinc-400">Signed in as </span>
            <span className="break-all font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>
          </div>
        ) : null}

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="profile-first" className="text-zinc-700 dark:text-zinc-300">
                  First name
                </Label>
                <Input
                  id="profile-first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="First name"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="profile-last" className="text-zinc-700 dark:text-zinc-300">
                  Last name
                </Label>
                <Input
                  id="profile-last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <Label htmlFor="profile-mobile" className="text-zinc-700 dark:text-zinc-300">
                Mobile <span className="font-normal text-zinc-500">(optional)</span>
              </Label>
              <Input
                id="profile-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                className={fieldControlInputCompactClassName}
                placeholder="For support or account contact"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="profile-city" className="text-zinc-700 dark:text-zinc-300">
                  City
                </Label>
                <Input
                  id="profile-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  className={fieldControlInputCompactClassName}
                  placeholder="City"
                />
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor="profile-country" className="text-zinc-700 dark:text-zinc-300">
                  Country
                </Label>
                <Input
                  id="profile-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  autoComplete="country-name"
                  className={fieldControlInputCompactClassName}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:flex-row sm:justify-end">
              <Button
                type="button"
                onClick={() => void onSaveProfile()}
                disabled={saving}
                className={cn(appPagePrimaryCtaClass, 'w-full min-h-[44px] sm:w-auto sm:min-h-10 sm:min-w-[10rem]')}
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </span>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard aria-labelledby="upload-mode-heading">
        <div className="border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <h2
            id="upload-mode-heading"
            className="font-display text-lg font-normal tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Upload screen
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Choose how strongly the uploader highlights pay-as-you-go pricing. File types and billing rules are the
            same.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tierOptions.map(({ tier, title, hint }) => {
            const selected = uploadTier === tier
            return (
              <button
                key={tier}
                type="button"
                onClick={() => {
                  setUploadTier(tier)
                  toast.success(
                    tier === 'payg'
                      ? 'Upload will emphasize price and confirmation.'
                      : 'Upload will use simpler prompts when everything is covered by credits.',
                  )
                }}
                className={cn(
                  'relative min-h-[4.5rem] w-full touch-manipulation rounded-2xl border px-4 py-3.5 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2',
                  'dark:focus-visible:ring-offset-zinc-950',
                  selected
                    ? 'border-brand-500 bg-brand-50/90 shadow-sm dark:border-brand-500 dark:bg-brand-950/40'
                    : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-zinc-600',
                )}
              >
                {selected ? (
                  <span
                    className={cn(
                      'absolute right-3 top-3 flex size-6 items-center justify-center rounded-full',
                      'bg-brand-600 text-white dark:bg-brand-500',
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                ) : null}
                <span className="flex items-start gap-2.5 pr-8">
                  <Sparkles
                    className={cn(
                      'mt-0.5 size-4 shrink-0 text-zinc-400 dark:text-zinc-500',
                      selected && 'text-brand-600 dark:text-brand-400',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-sm font-semibold',
                        selected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-800 dark:text-zinc-200',
                      )}
                    >
                      {title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {hint}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
