import { useState } from 'react'
import { useGameStore } from '@/store/game-store'
import { LevelPlay } from './LevelPlay'

/** The level screen. Every level, and every retry of it, gets a terminal of its own. */
export function GameScreen() {
  const currentLevel = useGameStore(s => s.currentLevel)
  const resetLevel = useGameStore(s => s.resetLevel)
  const [attempt, setAttempt] = useState(0)

  if (!currentLevel) return null

  const retry = () => {
    resetLevel()
    setAttempt(count => count + 1)
  }

  return <LevelPlay key={`${currentLevel.id}-${attempt}`} level={currentLevel} onRetry={retry} />
}
