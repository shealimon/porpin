import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers/AppProviders'
import './index.css'
import App from './App.tsx'
import { warmDocumentTemplateCache } from './lib/documentTemplates/templateEngine'

function scheduleTemplateWarmup() {
  const run = () => {
    try {
      warmDocumentTemplateCache()
    } catch {
      // Best-effort warmup only; never block app boot.
    }
  }

  // If the user is already entering the app shell, warm ASAP.
  if (window.location.pathname.startsWith('/app')) {
    queueMicrotask(run)
    return
  }

  // Otherwise (e.g. landing), defer heavy template compilation off the critical path.
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(run, { timeout: 2500 })
  } else {
    window.setTimeout(run, 1800)
  }
}

scheduleTemplateWarmup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
