import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Job, JobEstimate, JobListItem } from '../types/job'

interface JobStore {
  file: File | null
  job: Job | null
  estimate: JobEstimate | null
  history: JobListItem[]
  setFile: (file: File | null) => void
  setJob: (job: Job | null) => void
  setEstimate: (estimate: JobEstimate | null) => void
  setHistory: (items: JobListItem[]) => void
  upsertHistory: (item: JobListItem) => void
  resetSession: () => void
}

export const useJobStore = create<JobStore>()(
  persist(
    (set) => ({
      file: null,
      job: null,
      estimate: null,
      history: [],
      setFile: (file) => set({ file }),
      setJob: (job) => set({ job }),
      setEstimate: (estimate) => set({ estimate }),
      setHistory: (history) => set({ history }),
      upsertHistory: (item) =>
        set((s) => {
          const rest = s.history.filter((h) => h.id !== item.id)
          return { history: [item, ...rest] }
        }),
      resetSession: () => set({ file: null, job: null, estimate: null }),
    }),
    {
      name: 'translator-job-store',
      partialize: (s) => ({ history: s.history }),
    },
  ),
)
