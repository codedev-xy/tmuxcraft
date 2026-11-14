import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CardButton } from '@/components/ui/Card'
import { PageBackground } from '@/components/ui/PageBackground'
import { Pill } from '@/components/ui/Pill'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { CHALLENGE_DIFFICULTIES, CHALLENGE_TIME_LIMITS } from '@/game/challenge/difficulty'
import { bestRecord } from '@/game/challenge/records'
import type { ChallengeDifficulty, ChallengeRecord } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { DIFFICULTY_LOOK } from './difficulty-look'

interface DifficultyCardProps {
  difficulty: ChallengeDifficulty
  best: ChallengeRecord | null
  onStart: () => void
}

function DifficultyCard({ difficulty, best, onStart }: DifficultyCardProps) {
  const { t } = useTranslation()
  const look = DIFFICULTY_LOOK[difficulty]
  return (
    <CardButton
      data-tone={look.tone}
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center gap-3 p-6 text-center enabled:hover:border-tone-line sm:p-8"
    >
      <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full bg-tone-soft text-5xl transition group-hover:scale-110">
        {look.emoji}
      </span>
      <span className="font-display text-xl font-bold text-tone-strong">{t(`challenge.${difficulty}`)}</span>
      <span className="flex-1 text-sm leading-relaxed text-ink-soft">{t(`challenge.${difficulty}Desc`)}</span>
      <Pill>
        <span aria-hidden="true">⏱</span>
        {t('challenge.timeLimit', { seconds: CHALLENGE_TIME_LIMITS[difficulty] })}
      </Pill>
      <span className="text-xs text-ink-muted">
        {best ? t('challenge.best', { seconds: best.timeSeconds, count: best.commandCount }) : t('challenge.noBest')}
      </span>
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
  const startChallenge = useGameStore(s => s.startChallenge)
  const records = useProgressStore(s => s.challengeRecords)
  return (
    <PageBackground>
      <ScreenHeader title={t('challenge.title')} subtitle={t('challenge.selectDifficulty')} icon="🎯" onBack={() => setScreen('home')} />
      <main className="flex min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <ul className="m-auto grid w-full max-w-5xl gap-4 md:grid-cols-3 md:gap-6">
          {CHALLENGE_DIFFICULTIES.map((difficulty, index) => (
            <motion.li
              key={difficulty}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 220, damping: 22 }}
            >
              <DifficultyCard difficulty={difficulty} best={bestRecord(records, difficulty)} onStart={() => startChallenge(difficulty)} />
            </motion.li>
          ))}
        </ul>
      </main>
    </PageBackground>
  )
}
