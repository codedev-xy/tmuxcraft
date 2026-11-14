import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChip, PlayBar, PlayLayout, TerminalFrame } from '@/components/game/PlayLayout'
import { TerminalView } from '@/components/game/TerminalView'
import { IconButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'
import { cx } from '@/components/ui/cx'
import { useTmuxSession } from '@/hooks/useTmuxSession'
import { defaultState } from '@/core/state'
import type { InputResult } from '@/game/sim/simulate'
import { generateChallenge } from '@/game/challenge/challenge-generator'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'
import type { ChallengeGoal } from '@/game/level-types'
import { ChallengeResultDialog } from './ChallengeResultDialog'

const TIME_LIMIT = 60
const URGENT_FROM = 10

/** The challenge screen. Every round gets a new goal, clock and terminal. */
export function ChallengeScreen() {
  const [round, setRound] = useState(0)
  return <ChallengeRound key={round} onRetry={() => setRound(count => count + 1)} />
}

function Countdown({ timeLeft, urgent }: { timeLeft: number; urgent: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      role="timer"
      aria-label={t('challenge.timeLeft')}
      data-tone={urgent ? 'danger' : 'success'}
      className={cx('rounded-pill border border-tone-line bg-tone-soft px-4 py-1 font-display text-lg font-bold text-tone-strong tabular-nums', urgent && 'animate-urgent')}
    >
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
    </span>
  )
}

interface ChallengeHeaderProps {
  timeLeft: number
  urgent: boolean
  commandCount: number
  onBack: () => void
}

function ChallengeHeader({ timeLeft, urgent, commandCount, onBack }: ChallengeHeaderProps) {
  const { t } = useTranslation()
  return (
    <PlayBar>
      <IconButton label={t('challenge.backToMenu')} variant="dark-ghost" size="sm" onClick={onBack}>
        <span aria-hidden="true">←</span>
      </IconButton>
      <Pill tone="warning" solid>{t('challenge.beginner')}</Pill>
      <h1 className="min-w-0 flex-1 basis-40 font-display text-base font-bold text-term-text sm:text-lg">{t('challenge.title')}</h1>
      <Countdown timeLeft={timeLeft} urgent={urgent} />
      <BarChip label={t('challenge.commandsUsed')} value={commandCount} valueTestId="command-count" />
    </PlayBar>
  )
}

function GoalCard({ description }: { description: string }) {
  const { t } = useTranslation()
  return (
    <Card data-tone="warning" className="border-l-4 border-l-tone p-4">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
        <span aria-hidden="true">🎯</span>
        {t('challenge.goal')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
    </Card>
  )
}

function ChallengeRound({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const addChallengeRecord = useProgressStore(s => s.addChallengeRecord)
  const language = useUserStore(s => s.language)

  const [goal] = useState<ChallengeGoal>(() => generateChallenge('beginner', language))
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [isComplete, setIsComplete] = useState(false)
  const [commandCount, setCommandCount] = useState(0)

  const session = useTmuxSession(defaultState)

  const isFailed = timeLeft === 0 && !isComplete
  const isRunning = timeLeft > 0 && !isComplete

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setTimeLeft(left => Math.max(0, left - 1)), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleResult = (result: InputResult) => {
    if (!result.counted) return
    const count = commandCount + 1
    setCommandCount(count)
    if (!goal.validate(result.state)) return
    setIsComplete(true)
    addChallengeRecord({
      difficulty: 'beginner',
      completedAt: new Date().toISOString(),
      timeSeconds: TIME_LIMIT - timeLeft,
      commandCount: count,
      targetDescription: goal.description,
    })
  }

  const backToMenu = () => setScreen('challenge-select')

  return (
    <>
      <PlayLayout
        header={<ChallengeHeader timeLeft={timeLeft} urgent={isRunning && timeLeft <= URGENT_FROM} commandCount={commandCount} onBack={backToMenu} />}
        terminal={
          <TerminalFrame title="tmux — bash">
            <TerminalView session={session} onResult={handleResult} disabled={!isRunning} />
          </TerminalFrame>
        }
        asideLabel={t('challenge.goal')}
        aside={<GoalCard description={goal.description} />}
      />
      <ChallengeResultDialog
        open={isComplete || isFailed}
        success={isComplete}
        goal={goal.description}
        seconds={TIME_LIMIT - timeLeft}
        commandCount={commandCount}
        onRetry={onRetry}
        onBack={backToMenu}
      />
    </>
  )
}
