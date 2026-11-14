import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChallengeRecord, LevelProgress, StarRating } from '@/game/level-types'
import { migrateProgress, PROGRESS_VERSION } from './progress-migrate'
import type { SavedProgress } from './progress-migrate'

interface ProgressState extends SavedProgress {
  completeLevel: (levelId: string, stars: StarRating, commandCount: number) => void
  addChallengeRecord: (record: ChallengeRecord) => void
  resetProgress: () => void
}

const EMPTY: SavedProgress = { levelProgress: {}, challengeRecords: [] }

/** The level's record after one more clear: stars are only ever gained, and the best step count is kept. */
function clearedOnceMore(previous: LevelProgress | undefined, levelId: string, stars: StarRating, commandCount: number): LevelProgress {
  return {
    levelId,
    completed: true,
    stars: {
      completed: stars.completed || (previous?.stars.completed ?? false),
      efficient: stars.efficient || (previous?.stars.efficient ?? false),
      noHints: stars.noHints || (previous?.stars.noHints ?? false),
    },
    bestCommandCount: previous ? Math.min(previous.bestCommandCount, commandCount) : commandCount,
    attempts: (previous?.attempts ?? 0) + 1,
    completedAt: new Date().toISOString(),
  }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    set => ({
      ...EMPTY,

      completeLevel: (levelId, stars, commandCount) => set(state => ({
        levelProgress: {
          ...state.levelProgress,
          [levelId]: clearedOnceMore(state.levelProgress[levelId], levelId, stars, commandCount),
        },
      })),

      addChallengeRecord: record => set(state => ({ challengeRecords: [...state.challengeRecords, record] })),

      resetProgress: () => set(EMPTY),
    }),
    {
      name: 'tmuxcraft-progress',
      version: PROGRESS_VERSION,
      migrate: migrateProgress,
      partialize: ({ levelProgress, challengeRecords }) => ({ levelProgress, challengeRecords }),
    },
  ),
)
