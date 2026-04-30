import {
  dashboardLabelForTranslationTarget,
  type TranslationTarget,
} from '@/features/upload/sourceLang'

type Props = {
  value: TranslationTarget
  onChange: (v: TranslationTarget) => void
  disabled?: boolean
  className?: string
}

export function SourceLangChips({ value, onChange, disabled, className }: Props) {
  return (
    <div
      className={className ?? 'file-input-bar__source-row'}
      role="radiogroup"
      aria-label="Translation style"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'hinglish'}
        disabled={disabled}
        className={`file-input-bar__source-chip${value === 'hinglish' ? ' file-input-bar__source-chip--active' : ''}`}
        onClick={() => onChange('hinglish')}
      >
        {dashboardLabelForTranslationTarget('hinglish')}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'hindi'}
        disabled={disabled}
        className={`file-input-bar__source-chip${value === 'hindi' ? ' file-input-bar__source-chip--active' : ''}`}
        onClick={() => onChange('hindi')}
      >
        {dashboardLabelForTranslationTarget('hindi')}
      </button>
    </div>
  )
}
