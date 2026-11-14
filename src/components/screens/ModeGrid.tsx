import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { CardButton } from '@/components/ui/Card'
import type { Tone } from '@/components/ui/tone'
import { useGameStore } from '@/store/game-store'

type Screen = Parameters<ReturnType<typeof useGameStore.getState>['setScreen']>[0]

interface Mode {
  screen: Screen
  emoji: string
  titleKey: string
  descriptionKey: string
  tone: Tone
}

const MODES: readonly Mode[] = [
  { screen: 'chapter-select', emoji: '📖', titleKey: 'home.startGame', descriptionKey: 'home.startGameDesc', tone: 'accent' },
  { screen: 'challenge-select', emoji: '🎯', titleKey: 'home.challenge', descriptionKey: 'home.challengeDesc', tone: 'warning' },
  { screen: 'reference', emoji: '📚', titleKey: 'home.reference', descriptionKey: 'home.referenceDesc', tone: 'success' },
  { screen: 'settings', emoji: '⚙️', titleKey: 'home.settings', descriptionKey: 'home.settingsDesc', tone: 'neutral' },
]

function ModeCard({ mode, onOpen }: { mode: Mode; onOpen: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <CardButton
      data-tone={mode.tone}
      onClick={onOpen}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
      className="flex h-full w-full flex-col items-center gap-2 p-5"
    >
      <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full border border-tone-line bg-tone-soft text-3xl">
        {mode.emoji}
      </span>
      <span id={`${id}-title`} className="mt-1 text-center font-display text-lg font-bold text-tone-strong">{t(mode.titleKey)}</span>
      <span id={`${id}-desc`} className="text-center text-sm leading-relaxed text-ink-muted">{t(mode.descriptionKey)}</span>
    </CardButton>
  )
}

/** The ways into the game from the home page. */
export function ModeGrid() {
  const setScreen = useGameStore(s => s.setScreen)
  return (
    <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {MODES.map((mode, index) => (
        <motion.li
          key={mode.screen}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + index * 0.08, type: 'spring', stiffness: 160, damping: 18 }}
        >
          <ModeCard mode={mode} onOpen={() => setScreen(mode.screen)} />
        </motion.li>
      ))}
    </ul>
  )
}
