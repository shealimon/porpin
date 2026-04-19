const STORAGE_KEY = 'translator_user_name'

/** Local display name; set via localStorage for now (e.g. future profile). */
export function getStoredUserName(): string {
  if (typeof window === 'undefined') return ''
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').trim()
  } catch {
    return ''
  }
}

/** Join first + last for greetings; falls back to a single stored full string. */
export function displayNameFromNameParts(first?: string, last?: string): string {
  const f = first?.trim() ?? ''
  const l = last?.trim() ?? ''
  return [f, l].filter(Boolean).join(' ')
}

export function setStoredUserName(name: string): void {
  try {
    const t = name.trim()
    if (t) localStorage.setItem(STORAGE_KEY, t)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Phrase only: Good morning / afternoon / evening / night (local clock). */
export function getGreetingPhrase(date: Date = new Date()): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Good night'
}

function firstWord(name: string): string {
  const t = name.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? t
}

/**
 * Name after the time-of-day phrase: account first name, else first word of stored/env
 * display name (e.g. "Taufique Ahmad" → "Taufique").
 */
export function getGreetingDisplayName(options?: { firstName?: string }): string {
  const fn = options?.firstName?.trim()
  if (fn) return firstWord(fn)
  const stored = getStoredUserName()
  if (stored) return firstWord(stored)
  const fromEnv = import.meta.env.VITE_USER_DISPLAY_NAME?.trim()
  return fromEnv ? firstWord(fromEnv) : ''
}

/** Full line, e.g. "Good morning, Taufique" or "Good morning" if no name set. */
export function formatGreetingLine(
  date: Date = new Date(),
  options?: { firstName?: string },
): string {
  const phrase = getGreetingPhrase(date)
  const name = getGreetingDisplayName(options)
  return name ? `${phrase}, ${name}` : phrase
}
