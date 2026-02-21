import { create } from 'zustand'
import type { LevelDefinition, StarRating } from '@/game/level-types'

type Screen = 'home' | 'chapter-select' | 'level-select' | 'game' | 'challenge' | 'challenge-select' | 'reference' | 'settings'

interface GameState {
  currentScreen: Screen
  currentLevel: LevelDefinition | null
  currentChapter: number
  commandCount: number
  hintsUsed: number
  comboCount: number
  maxCombo: number
  isLevelComplete: boolean
  stars: StarRating

  setScreen: (screen: Screen) => void
  setChapter: (chapter: number) => void
  startLevel: (level: LevelDefinition) => void
  addCommand: () => void
  incrementCombo: () => void
  resetCombo: () => void
  useHint: () => void
  completeLevel: (stars: StarRating) => void
  resetLevel: () => void
}

export const useGameStore = create<GameState>()((set) => ({
  currentScreen: 'home',
  currentLevel: null,
  currentChapter: 1,
  commandCount: 0,
  hintsUsed: 0,
  comboCount: 0,
  maxCombo: 0,
  isLevelComplete: false,
  stars: { completed: false, efficient: false, noHints: false },

  setScreen: (screen) => set({ currentScreen: screen }),
  setChapter: (chapter) => set({ currentChapter: chapter }),

  startLevel: (level) => set({
    currentLevel: level,
    commandCount: 0,
    hintsUsed: 0,
    comboCount: 0,
    maxCombo: 0,
    isLevelComplete: false,
    stars: { completed: false, efficient: false, noHints: false },
    currentScreen: 'game',
  }),

  addCommand: () => set((s) => ({
    commandCount: s.commandCount + 1,
  })),

  incrementCombo: () => set((s) => ({
    comboCount: s.comboCount + 1,
    maxCombo: Math.max(s.maxCombo, s.comboCount + 1),
  })),

  resetCombo: () => set({ comboCount: 0 }),

  useHint: () => set((s) => ({ hintsUsed: s.hintsUsed + 1 })),

  completeLevel: (stars) => set({ isLevelComplete: true, stars }),

  resetLevel: () => set({
    commandCount: 0,
    hintsUsed: 0,
    comboCount: 0,
    maxCombo: 0,
    isLevelComplete: false,
    stars: { completed: false, efficient: false, noHints: false },
  }),
}))
