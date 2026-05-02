import { useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Mail, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { apiClient } from '@/api/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loadAccountProfileForQuery } from '@/lib/accountProfileLoad'
import { appPageHeaderClass, appPageTitleClass } from '@/lib/appPageLayout'
import {
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
} from '@/lib/authFormStyles'
import { qk } from '@/lib/queryKeys'
import {
  applySyncProfileResponse,
  type SyncProfileResponse,
} from '@/lib/syncBackendProfile'
import { supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { formatInMobileForApi, parseInMobileToLocal } from '@/lib/phoneCountryCodes'
import { displayNameFromNameParts, setStoredUserName } from '@/utils/greeting'

/** ≤480px horizontal rhythm — split L/R so insets match safe areas and stay symmetric. */
const settingsPhoneInsetXClass = cn(
  'phone:pl-[max(1rem,env(safe-area-inset-left))] phone:pr-[max(1rem,env(safe-area-inset-right))]',
)

/** Fixed footer: pin with explicit `left`+`right` (not `100vw` + padding) so width stays centered in the viewport. */
const settingsPhoneSaveBarPositionClass = cn(
  'phone:left-[max(1rem,env(safe-area-inset-left))] phone:right-[max(1rem,env(safe-area-inset-right))]',
  'phone:w-auto phone:max-w-none phone:min-w-0',
)

/** Light “edit profile” fields — compact height on phones; standard from `tab` up. */
const profileInputClassName = cn(
  'box-border w-full max-w-full min-w-0 rounded-xl border border-zinc-200 bg-white py-0 text-left shadow-none outline-none transition-colors placeholder:text-zinc-400',
  'h-12 min-h-12 px-4 text-base leading-normal text-zinc-900',
  'hover:border-zinc-300 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/25 focus-visible:ring-offset-0',
  'dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus-visible:border-zinc-400 dark:focus-visible:ring-zinc-500/25 dark:focus-visible:ring-inset',
  /* Phone: slightly taller controls + soft depth (native-sheet feel) */
  'phone:h-[3.25rem] phone:min-h-[3.25rem] phone:rounded-2xl phone:px-[1.0625rem] phone:shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
  'tab:h-11 tab:min-h-11 tab:rounded-lg tab:px-3 tab:text-sm tab:leading-5',
)

function ProfileInputTrail({
  className,
  children,
  trailing,
}: {
  className?: string
  children: ReactNode
  trailing: ReactNode
}) {
  return (
    <div className={cn('relative min-w-0 w-full max-w-full', className)}>
      {children}
      <span
        className="pointer-events-none absolute right-[0.6875rem] top-1/2 z-[1] flex size-9 shrink-0 -translate-y-1/2 items-center justify-center text-zinc-400 dark:text-zinc-500"
        aria-hidden
      >
        <span className="[&_svg]:size-[1.125rem]">{trailing}</span>
      </span>
    </div>
  )
}

function SectionCard({
  children,
  className,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        /* Narrow viewports: flush on app canvas; tab+ uses card. */
        'min-w-0 max-w-full rounded-none border-0 bg-transparent px-0 py-0 shadow-none',
        /* Tablet+: classic card rhythm */
        'tab:rounded-2xl tab:border tab:border-zinc-200/90 tab:bg-white tab:p-6 tab:shadow-sm',
        'dark:tab:border-zinc-800 dark:tab:bg-zinc-950/80',
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
    <div className="flex min-w-0 w-full max-w-full flex-col space-y-2 phone:space-y-1.5 tab:space-y-3">
      <Label
        htmlFor={id}
        className={cn(
          authFormLabelLightClass,
          'block w-full text-left',
          'text-zinc-500 dark:text-zinc-400',
          'phone:text-[0.6875rem] phone:tracking-[0.12em] phone:text-zinc-400 dark:phone:text-zinc-500',
        )}
      >
        {label}
      </Label>
      <div className="w-full min-w-0 max-w-full">{children}</div>
    </div>
  )
}

function ProfileFieldSkeleton() {
  return (
    <div className="space-y-2 tab:space-y-3">
      <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-200/90 dark:bg-zinc-800/90 tab:h-11 tab:rounded-lg" />
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
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

  const email = user?.email ?? ''

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
    <div
      className={cn(
        'mx-auto min-w-0 w-full pb-2 tab:max-w-full tab:pb-0 desk:max-w-xl desk:space-y-10',
        /* Tablet+: centered card column */
        'max-w-md tab:max-w-full',
        /* Phone: full-width sheet (native settings) — one inset column via inner wrapper below */
        'phone:max-w-none phone:px-0',
      )}
    >
      {/* Phones: single horizontal gutter for header + fields (tab+ uses display:contents so layout unchanged). */}
      <div
        className={cn(
          'phone:box-border phone:w-full phone:min-w-0 phone:max-w-full',
          settingsPhoneInsetXClass,
          /* Tablet+: participate in `AppLayout` horizontal padding; no extra inset here */
          'tab:contents tab:max-w-full tab:p-0',
        )}
      >
        <header
          className={cn(
            appPageHeaderClass,
            'mb-4 w-full min-w-0 max-w-full tab:mb-7 desk:mb-8',
            /* Phone: same block header as BillingPage (title only, no back). */
            'phone:block',
            /* Narrow tablet: back + centered title + spacer */
            'tab:flex tab:min-h-[2.875rem] tab:items-center',
            'desk:block',
          )}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={cn(
              'relative z-10 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center',
              'rounded-none border-0 bg-transparent p-0',
              'text-zinc-900 transition-opacity hover:opacity-60 active:opacity-45',
              'dark:text-zinc-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-0 dark:focus-visible:ring-zinc-300/35',
              'phone:hidden desk:hidden',
              'tab:-ml-1 tab:rounded-full tab:transition-[transform,background-color,opacity] tab:hover:bg-zinc-100/90 tab:hover:opacity-100 tab:active:scale-[0.96] dark:tab:hover:bg-zinc-800/80',
            )}
            aria-label="Go back"
          >
            <ArrowLeft className="size-[1.35rem]" aria-hidden strokeWidth={2} />
          </button>
          <h1
            className={cn(
              appPageTitleClass,
              'w-full min-w-0 max-w-full truncate',
              'tab:min-w-0 tab:flex-1 tab:text-center',
              'desk:text-left',
            )}
          >
            Profile
          </h1>
          <span
            className="inline-flex size-11 shrink-0 select-none phone:hidden desk:hidden"
            aria-hidden
          />
        </header>

        <SectionCard
          aria-labelledby="profile-form-title"
          className={cn(
            /* Phone: no second surface — fields sit on same canvas as AppLayout (avoids stacked whites/grays). */
            'phone:mt-3 phone:rounded-none phone:border-0 phone:bg-transparent phone:py-5 phone:shadow-none',
            'dark:phone:bg-transparent',
          )}
        >
        <h2 id="profile-form-title" className="sr-only">
          Your profile details
        </h2>

        {profileQuery.isError && canFetchProfile ? (
          <div
            className="mb-4 rounded-xl border border-red-200 bg-red-50/90 px-4 py-2.5 text-sm text-red-900 tab:mb-6 tab:py-3 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100"
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
          <div className="space-y-3 phone:space-y-5 tab:space-y-7" aria-busy>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="size-4 animate-spin text-zinc-600 dark:text-zinc-400" aria-hidden />
              Loading profile…
            </div>
            <ProfileFieldSkeleton />
            <ProfileFieldSkeleton />
            <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 tab:grid-cols-2 tab:gap-x-6 tab:gap-y-7 desk:grid-cols-1">
              <ProfileFieldSkeleton />
              <ProfileFieldSkeleton />
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'flex w-full min-w-0 max-w-full flex-col gap-3',
                'phone:gap-5',
                'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] phone:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]',
                'tab:gap-6 tab:pb-0 desk:pb-0',
              )}
            >
              {email ? (
                <ProfileField id="profile-email-ro" label="Email">
                  <ProfileInputTrail trailing={<Mail className="stroke-[1.85]" aria-hidden />}>
                    <Input
                      id="profile-email-ro"
                      readOnly
                      tabIndex={-1}
                      value={email}
                      aria-label="Your email address (read only)"
                      className={cn(
                        profileInputClassName,
                        'cursor-default break-all pr-12 text-left text-zinc-600 ring-0 dark:text-zinc-400',
                      )}
                    />
                  </ProfileInputTrail>
                  <p className="sr-only">
                    Signed in email cannot be edited here.
                  </p>
                </ProfileField>
              ) : null}

              <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 phone:gap-4 tab:grid-cols-2 tab:gap-x-6 tab:gap-y-6 desk:grid-cols-1 desk:gap-y-7">
                <ProfileField id="profile-first" label="First name">
                  <Input
                    id="profile-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className={profileInputClassName}
                    placeholder="First name"
                  />
                </ProfileField>
                <ProfileField id="profile-last" label="Last name">
                  <Input
                    id="profile-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className={profileInputClassName}
                    placeholder="Last name"
                  />
                </ProfileField>
              </div>

              <ProfileField id="profile-mobile-local" label="Mobile">
                <Input
                  id="profile-mobile-local"
                  value={mobileLocal}
                  onChange={(e) => setMobileLocal(e.target.value.replace(/\D/g, ''))}
                  autoComplete="tel-national"
                  inputMode="numeric"
                  className={profileInputClassName}
                  placeholder="10-digit mobile number"
                  aria-label="Mobile number"
                />
              </ProfileField>

              <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 phone:gap-4 tab:grid-cols-2 tab:gap-x-6 tab:gap-y-6 desk:grid-cols-1 desk:gap-y-7">
                <ProfileField id="profile-city" label="City">
                  <ProfileInputTrail trailing={<MapPin className="stroke-[1.85]" aria-hidden />}>
                    <Input
                      id="profile-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      autoComplete="address-level2"
                      className={cn(profileInputClassName, 'break-words pr-12')}
                      placeholder="Your city"
                    />
                  </ProfileInputTrail>
                </ProfileField>
                <ProfileField id="profile-country" label="Country">
                  <ProfileInputTrail trailing={<MapPin className="stroke-[1.85]" aria-hidden />}>
                    <Input
                      id="profile-country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      autoComplete="country-name"
                      className={cn(profileInputClassName, 'break-words pr-12')}
                      placeholder="Country"
                    />
                  </ProfileInputTrail>
                </ProfileField>
              </div>
            </div>

            <div
              className={cn(
                /* Phone: docked bar — `left`+`right` insets (not full-bleed + px) keeps the strip symmetric vs scrollbars */
                'phone:pointer-events-none phone:fixed phone:bottom-0 phone:z-[90]',
                settingsPhoneSaveBarPositionClass,
                'phone:box-border phone:min-w-0',
                'phone:border-t phone:border-zinc-200/50 phone:bg-[var(--manus-canvas)] phone:pt-3 phone:shadow-none phone:backdrop-blur-none phone:supports-[backdrop-filter]:bg-[var(--manus-canvas)]',
                'phone:pb-[max(1rem,env(safe-area-inset-bottom))]',
                'dark:phone:border-zinc-800/50 dark:phone:bg-[var(--manus-canvas)] dark:phone:shadow-none dark:phone:supports-[backdrop-filter]:bg-[var(--manus-canvas)]',
                /* Tablet/desktop: flow below fields inside the card */
                'tab:relative tab:inset-auto tab:left-auto tab:right-auto tab:bottom-auto tab:z-auto tab:mx-0 tab:mt-8 tab:flex tab:w-full tab:max-w-none tab:justify-center tab:border-0 tab:bg-transparent tab:p-0 tab:px-0 tab:shadow-none tab:backdrop-blur-none tab:pointer-events-auto dark:tab:bg-transparent',
              )}
            >
              <div
                className={cn(
                  'pointer-events-auto min-w-0 max-w-full rounded-2xl border border-zinc-200/85 bg-white/98 p-1 shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.14)] backdrop-blur-md',
                  /* Phone: row centers the control; button fills the inset strip so it lines up with fields */
                  'phone:flex phone:w-full phone:min-w-0 phone:max-w-full phone:justify-center phone:rounded-none phone:border-0 phone:bg-transparent phone:p-0 phone:shadow-none phone:backdrop-blur-none',
                  'tab:box-border tab:flex tab:w-full tab:justify-center',
                  'dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/40',
                  'tab:max-w-none tab:rounded-none tab:border-0 tab:bg-transparent tab:p-0 tab:shadow-none dark:tab:bg-transparent',
                )}
              >
                <button
                  type="button"
                  onClick={() => void onSaveProfile()}
                  disabled={saving}
                  className={cn(
                    authFormPrimaryButtonLightClass,
                    'box-border inline-flex touch-manipulation items-center justify-center gap-2',
                    'h-12 min-h-12 w-full max-w-full min-w-0 rounded-[0.875rem] tab:h-11 tab:min-h-11 tab:w-auto tab:rounded-lg tab:px-10',
                    'shadow-sm dark:hover:!bg-zinc-700',
                    /* Phone: full width of inset bar = same edges as inputs above */
                    'phone:pointer-events-auto phone:mx-auto phone:h-[3.25rem] phone:min-h-[3.25rem] phone:w-full phone:max-w-full phone:shrink-0 phone:rounded-2xl phone:text-[0.9375rem] phone:font-semibold phone:tracking-wide phone:shadow-[0_2px_8px_-2px_rgba(15,23,42,0.25)]',
                  )}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
        </SectionCard>
      </div>
    </div>
  )
}
