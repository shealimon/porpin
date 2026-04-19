import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { AuthSessionSync } from '@/components/auth/AuthSessionSync'
import { PorpinLoadingIndicator } from '@/components/brand/PorpinLoadingIndicator'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/queryClient'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delay={0}>
        <BrowserRouter>
          <AuthSessionSync />
          {children}
          <PorpinLoadingIndicator />
          <Toaster position="top-center" />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
