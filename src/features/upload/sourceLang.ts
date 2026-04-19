export const SOURCE_LANG_STORAGE_KEY = 'translator.uploadSourceLang'

export type SourceLang = 'en' | 'hi'

export function readStoredSourceLang(): SourceLang {
  try {
    if (typeof localStorage === 'undefined') return 'en'
    const v = localStorage.getItem(SOURCE_LANG_STORAGE_KEY)
    return v === 'hi' ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

export function writeStoredSourceLang(v: SourceLang): void {
  try {
    localStorage.setItem(SOURCE_LANG_STORAGE_KEY, v)
  } catch {
    /* ignore quota / private mode */
  }
}
