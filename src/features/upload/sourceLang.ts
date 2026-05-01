/** @deprecated use `translationTarget` — kept for one-time localStorage migration */
const LEGACY_SOURCE_KEY = 'translator.uploadSourceLang'

export const TRANSLATION_TARGET_STORAGE_KEY = 'translator.uploadTranslationTarget'

export type TranslationTarget = 'hinglish' | 'hindi'

/** Dashboard copy only; API/filenames stay Hinglish / Hindi. */
export function dashboardLabelForTranslationTarget(
  target: string | null | undefined,
): 'Easy Hinglish' | 'Pure Hindi' {
  const t = (target ?? 'hinglish').toLowerCase()
  return t === 'hindi' ? 'Pure Hindi' : 'Easy Hinglish'
}

export function readStoredTranslationTarget(): TranslationTarget {
  try {
    if (typeof localStorage === 'undefined') return 'hinglish'
    const v = localStorage.getItem(TRANSLATION_TARGET_STORAGE_KEY)
    if (v === 'hindi' || v === 'hinglish') return v
    const legacy = localStorage.getItem(LEGACY_SOURCE_KEY)
    if (legacy === 'hi' || legacy === 'en') {
      writeStoredTranslationTarget('hinglish')
      try {
        localStorage.removeItem(LEGACY_SOURCE_KEY)
      } catch {
        /* ignore */
      }
    }
    return 'hinglish'
  } catch {
    return 'hinglish'
  }
}

export function writeStoredTranslationTarget(v: TranslationTarget): void {
  try {
    localStorage.setItem(TRANSLATION_TARGET_STORAGE_KEY, v)
  } catch {
    /* ignore quota / private mode */
  }
}

/** @deprecated use TranslationTarget; only `hinglish` was produced for both legacy chips */
export type SourceLang = 'en' | 'hi'

/** @deprecated use readStoredTranslationTarget */
export function readStoredSourceLang(): SourceLang {
  return readStoredTranslationTarget() === 'hindi' ? 'hi' : 'en'
}

/** @deprecated */
export function writeStoredSourceLang(_v: SourceLang): void {
  writeStoredTranslationTarget('hinglish')
}
