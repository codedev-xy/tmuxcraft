import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CardButton } from '@/components/ui/Card'
import { PageBackground } from '@/components/ui/PageBackground'
import { Pill } from '@/components/ui/Pill'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { Tone } from '@/components/ui/tone'
import type { ChallengeDifficulty } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'

interface Difficulty {
  key: ChallengeDifficulty
  timeLimit: number
  emoji: string
  tone: Tone
}

const DIFFICULTIES: readonly Difficulty[] = [
  { key: 'beginner', timeLimit: 60, emoji: '🌱', tone: 'success' },
  { key: 'intermediate', timeLimit: 90, emoji: '⚡', tone: 'warning' },
  { key: 'advanced', timeLimit: 120, emoji: '🔥', tone: 'danger' },
]

function DifficultyCard({ difficulty, onStart }: { difficulty: Difficulty; onStart: () => void }) {
  const { t } = useTranslation()
  return (
    <CardButton
      data-tone={difficulty.tone}
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center gap-3 p-6 text-center enabled:hover:border-tone-line sm:p-8"
    >
      <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-tone-soft text-5xl transition group-hover:scale-110">
        {difficulty.emoji}
      </span>
      <span className="font-display text-xl font-bold text-tone-strong">{t(`challenge.${difficulty.key}`)}</span>
      <span className="flex-1 text-sm leading-relaxed text-ink-soft">{t(`challenge.${difficulty.key}Desc`)}</span>
      <Pill>
        <span aria-hidden="true">⏱</span>
        {t('challenge.timeLimit', { seconds: difficulty.timeLimit })}
      </Pill>
      <span className="mt-1 text-sm font-bold text-tone-strong">
        {t('challenge.start')}
        <span aria-hidden="true" className="ml-1 inline-block transition group-hover:translate-x-1">→</span>
      </span>
    </CardButton>
  )
}

export function ChallengeSelect() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  return (
    <PageBackground>
      <ScreenHeader title={t('challenge.title')} subtitle={t('challenge.selectDifficulty')} icon="🎯" onBack={() => setScreen('home')} />
      <main className="flex min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <ul className="m-auto grid w-full max-w-5xl gap-4 md:grid-cols-3 md:gap-6">
          {DIFFICULTIES.map((difficulty, index) => (
            <motion.li
              key={difficulty.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 220, damping: 22 }}
            >
              <DifficultyCard difficulty={difficulty} onStart={() => setScreen('challenge')} />
            </motion.li>
          ))}
        </ul>
      </main>
    </PageBackground>
  )
}
