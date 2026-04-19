export const qk = {
  me: {
    all: ['me'] as const,
    /** POST /me/sync-profile — cached per signed-in user (Account page). */
    syncProfile: (userId: string) => [...qk.me.all, 'sync-profile', userId] as const,
  },
  pricing: {
    all: ['pricing'] as const,
    config: () => [...qk.pricing.all, 'config'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: () => [...qk.jobs.all, 'list'] as const,
    /** Supabase `public.jobs`: status = completed, paginated (History). */
    completedPage: (page: number, pageSize: number) =>
      [...qk.jobs.all, 'completed', page, pageSize] as const,
    detail: (id: string) => [...qk.jobs.all, 'detail', id] as const,
  },
} as const
