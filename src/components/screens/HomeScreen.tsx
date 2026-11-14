import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageBackground } from '@/components/ui/PageBackground'
import { ALL_LEVELS, STARS_PER_LEVEL, completedCount, nextUnfinished, totalStars } from '@/game/chapters'
import type { LevelDefinition } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { LanguageToggle } from './LanguageToggle'
import { ModeGrid } from './ModeGrid'
import { ProgressSummary } from './ProgressSummary'

function continueLabel(t: TFunction, next: LevelDefinition | null, isNewPlayer: boolean): string {
  if (!next) return t('home.allDone')
  return t(isNewPlayer ? 'home.start' : 'home.continue', { id: next.id, title: t(next.titleKey) })
}

function ContinuePanel() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const startLevel = useGameStore(s => s.startLevel)
  const levelProgress = useProgressStore(s => s.levelProgress)
  const next = nextUnfinished(levelProgress)
  const completed = completedCount(levelProgress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="w-full max-w-2xl"
    >
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <Button
          variant={next ? 'chapter' : 'success'}
          size="lg"
          className="w-full"
          onClick={() => (next ? startLevel(next) : setScreen('chapter-select'))}
        >
          <span aria-hidden="true">{next ? '▶' : '🏆'}</span>
          <span className="min-w-0">{continueLabel(t, next, completed === 0)}</span>
        </Button>
        <ProgressSummary
          completed={completed}
          total={ALL_LEVELS.length}
          stars={totalStars(levelProgress)}
          maxStars={ALL_LEVELS.length * STARS_PER_LEVEL}
          label={t('home.progress')}
          tone="accent"
        />
      </Card>
    </motion.div>
  )
}

function Hero() {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="text-center"
    >
      <h1 className="bg-linear-to-r from-accent via-accent-alt to-chapter-3 bg-clip-text pb-2 font-display text-5xl font-bold text-transparent sm:text-7xl">
        {t('app.title')}
      </h1>
      <p className="mt-2 text-lg font-medium text-ink-muted sm:text-xl">{t('app.subtitle')}</p>
    </motion.div>
  )
}

export function HomeScreen() {
  const levelProgress = useProgressStore(s => s.levelProgress)
  const chapter = nextUnfinished(levelProgress)?.chapter ?? 1

  return (
    <PageBackground chapter={chapter}>
      <div className="flex shrink-0 justify-end px-4 pt-4 sm:px-6">
        <LanguageToggle />
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center gap-8 px-4 pt-2 pb-10 sm:px-6">
          <Hero />
          <ContinuePanel />
          <ModeGrid />
        </div>
      </main>
    </PageBackground>
  )
}
