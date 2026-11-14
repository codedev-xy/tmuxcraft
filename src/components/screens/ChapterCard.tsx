import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { CardButton } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { STARS_PER_LEVEL, chapterStars, completedCount } from '@/game/chapters'
import type { Chapter, ProgressMap } from '@/game/chapters'
import { CHAPTER_EMOJI, chapterDescriptionKey, chapterTitleKey } from './chapter-meta'
import { ProgressSummary } from './ProgressSummary'

interface ChapterCardProps {
  chapter: Chapter
  progress: ProgressMap
  onOpen: () => void
}

export function ChapterCard({ chapter, progress, onOpen }: ChapterCardProps) {
  const { t } = useTranslation()
  const id = useId()
  const title = t(chapterTitleKey(chapter.id))
  const total = chapter.levels.length
  const completed = completedCount(progress, chapter.id)

  return (
    <CardButton
      data-chapter={chapter.id}
      onClick={onOpen}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      className="flex h-full w-full flex-col overflow-hidden"
    >
      <span className="relative flex h-32 w-full items-center justify-center gap-4 bg-linear-to-br from-chapter to-chapter-strong">
        <span aria-hidden="true" className="text-5xl drop-shadow-lg">{CHAPTER_EMOJI[chapter.id]}</span>
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full border-2 border-white/40 bg-white/25 font-display text-xl font-bold text-white">
          {chapter.id}
        </span>
        {completed === total && (
          <Pill tone="success" solid className="absolute top-3 right-3">
            <span aria-hidden="true">✓</span>
            {t('chapters.cleared')}
          </Pill>
        )}
      </span>
      <span className="flex w-full flex-1 flex-col gap-2 p-5">
        <span id={`${id}-title`} className="font-display text-lg font-bold text-ink">{title}</span>
        <span id={`${id}-desc`} className="flex-1 text-sm leading-relaxed text-ink-muted">{t(chapterDescriptionKey(chapter.id))}</span>
        <ProgressSummary
          className="mt-3"
          completed={completed}
          total={total}
          stars={chapterStars(progress, chapter.id)}
          maxStars={total * STARS_PER_LEVEL}
          label={t('chapters.progressLabel', { title })}
        />
      </span>
    </CardButton>
  )
}
