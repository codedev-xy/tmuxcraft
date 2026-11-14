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
import { challengeComplete, generateChallenge } from '@/game/challenge/challenge-generator'
import { CHALLENGE_TIME_LIMITS } from '@/game/challenge/difficulty'
import { isNewBest } from '@/game/challenge/records'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import type { ChallengeDifficulty, ChallengeGoal, ChallengeRecord, ChallengeTask } from '@/game/level-types'
import { ChallengeResultDialog } from './ChallengeResultDialog'
import { ChallengeTaskList } from './ChallengeTaskList'
import { DIFFICULTY_LOOK } from './difficulty-look'

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
  difficulty: ChallengeDifficulty
  timeLeft: number
  urgent: boolean
  commandCount: number
  onBack: () => void
}

function ChallengeHeader({ difficulty, timeLeft, urgent, commandCount, onBack }: ChallengeHeaderProps) {
  const { t } = useTranslation()
  return (
    <PlayBar>
      <IconButton label={t('challenge.backToMenu')} variant="dark-ghost" size="sm" onClick={onBack}>
        <span aria-hidden="true">←</span>
      </IconButton>
      <Pill tone={DIFFICULTY_LOOK[difficulty].tone} solid>
        <span aria-hidden="true">{DIFFICULTY_LOOK[difficulty].emoji}</span>
        {t(`challenge.${difficulty}`)}
      </Pill>
      <h1 className="min-w-0 flex-1 basis-40 font-display text-base font-bold text-term-text sm:text-lg">{t('challenge.title')}</h1>
      <Countdown timeLeft={timeLeft} urgent={urgent} />
      <BarChip label={t('challenge.commandsUsed')} value={commandCount} valueTestId="command-count" />
    </PlayBar>
  )
}

function GoalCard({ tasks, done }: { tasks: readonly ChallengeTask[]; done: readonly string[] }) {
  const { t } = useTranslation()
  return (
    <Card data-tone="warning" className="border-l-4 border-l-tone p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink">
          <span aria-hidden="true">🎯</span>
          {t('challenge.goal')}
        </h2>
        <Pill tone={done.length === tasks.length ? 'success' : 'accent'}>{done.length}/{tasks.length}</Pill>
      </div>
      <ChallengeTaskList tasks={tasks} done={done} className="mt-3" />
    </Card>
  )
}

function ChallengeRound({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const difficulty = useGameStore(s => s.challengeDifficulty)
  const addChallengeRecord = useProgressStore(s => s.addChallengeRecord)
  const limit = CHALLENGE_TIME_LIMITS[difficulty]

  const [goal] = useState<ChallengeGoal>(() => generateChallenge(difficulty))
  const [timeLeft, setTimeLeft] = useState(limit)
  const [commandCount, setCommandCount] = useState(0)
  /** How the round was won: null until it is. */
  const [win, setWin] = useState<{ newBest: boolean } | null>(null)

  const session = useTmuxSession(defaultState)

  const isComplete = win !== null
  const isFailed = timeLeft === 0 && !isComplete
  const isRunning = timeLeft > 0 && !isComplete
  const done = goal.tasks.filter(task => task.validate(session.state)).map(task => task.id)

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setTimeLeft(left => Math.max(0, left - 1)), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleResult = (result: InputResult) => {
    if (!result.counted) return
    const count = commandCount + 1
    setCommandCount(count)
    if (!challengeComplete(goal, result.state)) return
    const round: ChallengeRecord = {
      difficulty,
      completedAt: new Date().toISOString(),
      timeSeconds: limit - timeLeft,
      commandCount: count,
    }
    setWin({ newBest: isNewBest(useProgressStore.getState().challengeRecords, round) })
    addChallengeRecord(round)
  }

  const backToMenu = () => setScreen('challenge-select')

  return (
    <>
      <PlayLayout
        header={
          <ChallengeHeader
            difficulty={difficulty}
            timeLeft={timeLeft}
            urgent={isRunning && timeLeft <= URGENT_FROM}
            commandCount={commandCount}
            onBack={backToMenu}
          />
        }
        terminal={
          <TerminalFrame title="tmux — bash">
            <TerminalView session={session} onResult={handleResult} disabled={!isRunning} />
          </TerminalFrame>
        }
        asideLabel={t('challenge.goal')}
        aside={<GoalCard tasks={goal.tasks} done={done} />}
      />
      <ChallengeResultDialog
        open={isComplete || isFailed}
        success={isComplete}
        newBest={win?.newBest ?? false}
        tasks={goal.tasks}
        done={done}
        seconds={limit - timeLeft}
        commandCount={commandCount}
        onRetry={onRetry}
        onBack={backToMenu}
      />
    </>
  )
}
