import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { renderHintText } from '@/components/game/hint-utils'
import { CardButton } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { StarRating } from '@/components/ui/StarRating'
import { cx } from '@/components/ui/cx'
import type { LevelDefinition, LevelProgress } from '@/game/level-types'

interface LevelCardProps {
  level: LevelDefinition
  progress?: LevelProgress
  /** The level the player should play next. */
  isNext: boolean
  onStart: () => void
}

function LevelStatus({ progress, isNext }: Pick<LevelCardProps, 'progress' | 'isNext'>) {
  const { t } = useTranslation()
  if (isNext) {
    return (
      <Pill tone="chapter" solid>
        <span aria-hidden="true">▶</span>
        {t('chapters.next')}
      </Pill>
    )
  }
  if (!progress?.completed) return null
  return (
    <Pill tone="success">
      <span aria-hidden="true">✓</span>
      {t('levels.completed')}
    </Pill>
  )
}

export function LevelCard({ level, progress, isNext, onStart }: LevelCardProps) {
  const { t } = useTranslation()
  const id = useId()
  const completed = progress?.completed ?? false

  return (
    <CardButton
      onClick={onStart}
      aria-labelledby={`${id}-number ${id}-title`}
      aria-describedby={`${id}-status ${id}-desc`}
      className={cx(
        'flex h-full w-full flex-col gap-2 p-4',
        isNext && 'bg-linear-to-br from-chapter-soft to-surface ring-2 ring-chapter',
      )}
    >
      <span className="flex w-full flex-wrap items-center justify-between gap-2">
        <span id={`${id}-number`} className="font-display text-sm font-bold text-chapter-strong">{level.id}</span>
        <span id={`${id}-status`}>
          <LevelStatus progress={progress} isNext={isNext} />
        </span>
      </span>
      <span id={`${id}-title`} className="font-display text-base leading-snug font-bold text-ink">{t(level.titleKey)}</span>
      <span id={`${id}-desc`} className="text-sm leading-relaxed text-ink-muted">{renderHintText(t(level.descriptionKey))}</span>
      {completed && progress && (
        <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs font-semibold text-ink-muted">
          <StarRating stars={progress.stars} />
          <span>{t('chapters.best', { count: progress.bestCommandCount })}</span>
        </span>
      )}
    </CardButton>
  )
}
