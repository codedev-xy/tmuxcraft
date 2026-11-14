import type { LevelProgress } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'

export function done(levelId: string, stars = 3, bestCommandCount = 4): LevelProgress {
  return {
    levelId,
    completed: true,
    stars: { completed: stars >= 1, efficient: stars >= 2, noHints: stars >= 3 },
    bestCommandCount,
    attempts: 1,
  }
}

export function setProgress(...entries: LevelProgress[]) {
  useProgressStore.setState({ levelProgress: Object.fromEntries(entries.map(entry => [entry.levelId, entry])) })
}

export function resetStores() {
  useProgressStore.setState({ levelProgress: {}, achievements: [], challengeRecords: [], chaptersCompleted: [] })
  useGameStore.setState({ currentScreen: 'home', currentLevel: null, currentChapter: 1 })
}
