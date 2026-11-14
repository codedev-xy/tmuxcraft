import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { PageBackground } from '@/components/ui/PageBackground'
import { Pill } from '@/components/ui/Pill'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { STARS_PER_LEVEL, chapterStars, completedCount, nextUnfinished } from '@/game/chapters'
import type { Chapter, ProgressMap } from '@/game/chapters'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { CHAPTER_EMOJI, chapterById, chapterDescriptionKey, chapterTitleKey } from './chapter-meta'
import { LevelCard } from './LevelCard'
import { ProgressSummary } from './ProgressSummary'

function ChapterSummary({ chapter, progress }: { chapter: Chapter; progress: ProgressMap }) {
  const { t } = useTranslation()
  const total = chapter.levels.length
  const completed = completedCount(progress, chapter.id)
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <ProgressSummary
        className="flex-1"
        completed={completed}
        total={total}
        stars={chapterStars(progress, chapter.id)}
        maxStars={total * STARS_PER_LEVEL}
        label={t('chapters.progressLabel', { title: t(chapterTitleKey(chapter.id)) })}
      />
      {completed === total && (
        <Pill tone="success" solid className="self-start sm:self-center">
          <span aria-hidden="true">✓</span>
          {t('chapters.cleared')}
        </Pill>
      )}
    </Card>
  )
}

export function LevelSelect() {
  const { t } = useTranslation()
  const currentChapter = useGameStore(s => s.currentChapter)
  const setScreen = useGameStore(s => s.setScreen)
  const startLevel = useGameStore(s => s.startLevel)
  const levelProgress = useProgressStore(s => s.levelProgress)
  const chapter = chapterById(currentChapter)
  const next = nextUnfinished(levelProgress, chapter.id)

  return (
    <PageBackground chapter={chapter.id}>
      <ScreenHeader
        title={t(chapterTitleKey(chapter.id))}
        subtitle={t(chapterDescriptionKey(chapter.id))}
        icon={CHAPTER_EMOJI[chapter.id]}
        onBack={() => setScreen('chapter-select')}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 sm:p-6">
          <ChapterSummary chapter={chapter} progress={levelProgress} />
          <h2 className="font-display text-base font-bold text-ink-soft">{t('levels.select')}</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chapter.levels.map((level, index) => (
              <motion.li
                key={level.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, type: 'spring', stiffness: 160, damping: 18 }}
              >
                <LevelCard
                  level={level}
                  progress={levelProgress[level.id]}
                  isNext={level.id === next?.id}
                  onStart={() => startLevel(level)}
                />
              </motion.li>
            ))}
          </ul>
        </div>
      </main>
    </PageBackground>
  )
}
