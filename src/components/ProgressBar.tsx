type ProgressBarProps = {
  value: number
  label?: string
  indeterminate?: boolean
}

export function ProgressBar({
  value,
  label,
  indeterminate,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {label && <span className="progress-bar__label">{label}</span>}
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill${indeterminate ? ' progress-bar__fill--pulse' : ''}`}
          style={indeterminate ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
