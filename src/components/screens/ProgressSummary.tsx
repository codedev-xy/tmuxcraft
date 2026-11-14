import { useTranslation } from 'react-i18next'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cx } from '@/components/ui/cx'
import type { Tone } from '@/components/ui/tone'

interface ProgressSummaryProps {
  completed: number
  total: number
  stars: number
  maxStars: number
  /** The progress bar's accessible name. */
  label: string
  tone?: Tone
  className?: string
}

/** Levels completed and stars earned, over a progress bar. */
export function ProgressSummary({ completed, total, stars, maxStars, label, tone = 'chapter', className }: ProgressSummaryProps) {
  const { t } = useTranslation()
  return (
    <span className={cx('flex flex-col gap-2', className)}>
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold text-ink-muted">
        <span>{t('chapters.progress', { completed, total })}</span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="text-sm text-star">★</span>
          <span>{t('chapters.stars', { count: stars, total: maxStars })}</span>
        </span>
      </span>
      <ProgressBar value={total > 0 ? completed / total : 0} label={label} tone={tone} />
    </span>
  )
}
