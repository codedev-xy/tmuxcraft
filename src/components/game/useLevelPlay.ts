import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAnimationControls } from 'framer-motion'
import type { TmuxError } from '@/core/errors'
import { getMaxHints } from '@/game/hint-system'
import type { LevelDefinition, ValidationResult } from '@/game/level-types'
import { calculateStars } from '@/game/scoring'
import type { InputResult } from '@/game/sim/simulate'
import { validateLevel } from '@/game/validator'
import { useTmuxSession } from '@/hooks/useTmuxSession'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'

const SHAKE = { x: [0, -4, 4, -3, 3, -1, 1, 0], transition: { duration: 0.4 } }

/** Counts what tmux took, keeps the combo, and remembers (and shakes on) the last refusal. */
function useCommandFeedback() {
  const addCommand = useGameStore(s => s.addCommand)
  const incrementCombo = useGameStore(s => s.incrementCombo)
  const resetCombo = useGameStore(s => s.resetCombo)
  const [error, setError] = useState<TmuxError | null>(null)
  const shake = useAnimationControls()

  const handleResult = useCallback((result: InputResult) => {
    if (result.counted) {
      addCommand()
      incrementCombo()
    }
    const failure = result.errors[0] ?? null
    setError(failure)
    if (failure === null) return
    resetCombo()
    void shake.start(SHAKE)
  }, [addCommand, incrementCombo, resetCombo, shake])

  return { error, shake, handleResult }
}

/** Once every objective holds after a command: score the level and save it. */
function useLevelCompletion(level: LevelDefinition, validation: ValidationResult) {
  const commandCount = useGameStore(s => s.commandCount)
  const hintsUsed = useGameStore(s => s.hintsUsed)
  const isLevelComplete = useGameStore(s => s.isLevelComplete)
  const markComplete = useGameStore(s => s.completeLevel)
  const saveProgress = useProgressStore(s => s.completeLevel)

  useEffect(() => {
    if (isLevelComplete || commandCount === 0 || !validation.isComplete) return
    const stars = calculateStars(commandCount, level.optimalSteps, hintsUsed)
    markComplete(stars)
    saveProgress(level.id, stars, commandCount)
  }, [validation, level, isLevelComplete, commandCount, hintsUsed, markComplete, saveProgress])
}

/** Everything a level attempt needs: the terminal session, validation, counters, hints and completion. */
export function useLevelPlay(level: LevelDefinition) {
  const session = useTmuxSession(level.initialState)
  const validation = useMemo(() => validateLevel(session.state, level), [session.state, level])
  const feedback = useCommandFeedback()
  useLevelCompletion(level, validation)

  const commandCount = useGameStore(s => s.commandCount)
  const comboCount = useGameStore(s => s.comboCount)
  const hintsUsed = useGameStore(s => s.hintsUsed)
  const isComplete = useGameStore(s => s.isLevelComplete)
  const stars = useGameStore(s => s.stars)
  const markHintUsed = useGameStore(s => s.useHint)

  const canRevealHint = !isComplete && hintsUsed < getMaxHints()
  const revealHint = useCallback(() => {
    if (canRevealHint) markHintUsed()
  }, [canRevealHint, markHintUsed])

  return { session, validation, commandCount, comboCount, hintsUsed, isComplete, stars, canRevealHint, revealHint, ...feedback }
}
