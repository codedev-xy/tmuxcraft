import { create } from 'zustand'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition, StarRating } from '@/game/level-types'

type Screen = 'home' | 'chapter-select' | 'level-select' | 'game' | 'challenge' | 'challenge-select' | 'achievements' | 'reference' | 'settings'

interface GameState {
  currentScreen: Screen
  currentLevel: LevelDefinition | null
  currentChapter: number
  tmuxState: TmuxState | null
  commandHistory: string[]
  commandCount: number
  hintsUsed: number
  comboCount: number
  maxCombo: number
  isLevelComplete: boolean
  stars: StarRating

  setScreen: (screen: Screen) => void
  setChapter: (chapter: number) => void
  startLevel: (level: LevelDefinition) => void
  setTmuxState: (state: TmuxState) => void
  addCommand: (cmd: string) => void
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
  tmuxState: null,
  commandHistory: [],
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
    tmuxState: level.initialState,
    commandHistory: [],
    commandCount: 0,
    hintsUsed: 0,
    comboCount: 0,
    maxCombo: 0,
    isLevelComplete: false,
    stars: { completed: false, efficient: false, noHints: false },
    currentScreen: 'game',
  }),

  setTmuxState: (state) => set({ tmuxState: state }),

  addCommand: (cmd) => set((s) => ({
    commandHistory: [...s.commandHistory, cmd],
    commandCount: s.commandCount + 1,
  })),

  incrementCombo: () => set((s) => ({
    comboCount: s.comboCount + 1,
    maxCombo: Math.max(s.maxCombo, s.comboCount + 1),
  })),

  resetCombo: () => set({ comboCount: 0 }),

  useHint: () => set((s) => ({ hintsUsed: s.hintsUsed + 1 })),

  completeLevel: (stars) => set({ isLevelComplete: true, stars }),

  resetLevel: () => set((s) => ({
    tmuxState: s.currentLevel?.initialState ?? null,
    commandHistory: [],
    commandCount: 0,
    hintsUsed: 0,
    comboCount: 0,
    maxCombo: 0,
    isLevelComplete: false,
    stars: { completed: false, efficient: false, noHints: false },
  })),
}))
