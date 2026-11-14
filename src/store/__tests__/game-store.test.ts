import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../game-store'

beforeEach(() => useGameStore.setState(useGameStore.getInitialState()))

describe('useGameStore', () => {
  it('starts on the beginner challenge', () => {
    expect(useGameStore.getState().challengeDifficulty).toBe('beginner')
  })

  it.each(['beginner', 'intermediate', 'advanced'] as const)('opens the %s challenge', difficulty => {
    useGameStore.getState().startChallenge(difficulty)
    expect(useGameStore.getState().challengeDifficulty).toBe(difficulty)
    expect(useGameStore.getState().currentScreen).toBe('challenge')
  })

  it('keeps the chosen difficulty when leaving for the menu', () => {
    useGameStore.getState().startChallenge('advanced')
    useGameStore.getState().setScreen('challenge-select')
    expect(useGameStore.getState().challengeDifficulty).toBe('advanced')
  })
})
