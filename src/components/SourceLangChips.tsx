import type { SourceLang } from '@/features/upload/sourceLang'

type Props = {
  value: SourceLang
  onChange: (v: SourceLang) => void
  disabled?: boolean
  className?: string
}

export function SourceLangChips({ value, onChange, disabled, className }: Props) {
  return (
    <div
      className={className ?? 'file-input-bar__source-row'}
      role="radiogroup"
      aria-label="Source language"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'en'}
        disabled={disabled}
        className={`file-input-bar__source-chip${value === 'en' ? ' file-input-bar__source-chip--active' : ''}`}
        onClick={() => onChange('en')}
      >
        English → Hinglish
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'hi'}
        disabled={disabled}
        className={`file-input-bar__source-chip${value === 'hi' ? ' file-input-bar__source-chip--active' : ''}`}
        onClick={() => onChange('hi')}
      >
        Hindi → Hinglish
      </button>
    </div>
  )
}
