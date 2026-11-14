import { cx } from './cx'
import type { Tone } from './tone'

interface ProgressBarProps {
  /** From 0 to 1. */
  value: number
  label: string
  /** The fill colour; left out, the bar follows the tone around it. */
  tone?: Tone
  onDark?: boolean
  className?: string
}

export function ProgressBar({ value, label, tone, onDark = false, className }: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      data-tone={tone}
      className={cx('h-2 overflow-hidden rounded-pill', onDark ? 'bg-term-raised' : 'bg-surface-sunken', className)}
    >
      <div className="h-full rounded-pill bg-tone transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  )
}
