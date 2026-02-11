import { useCallback } from 'react'
import { useProgressStore } from '@/store/progress-store'
import type { StarRating } from '@/game/level-types'

export function useGameProgress() {
  const store = useProgressStore()

  const completeLevel = useCallback((levelId: string, stars: StarRating, commandCount: number) => {
    store.completeLevel(levelId, stars, commandCount)
  }, [store])

  const isLevelUnlocked = useCallback((levelId: string): boolean => {
    return store.isLevelUnlocked(levelId)
  }, [store])

  const isChapterComplete = useCallback((chapter: number): boolean => {
    return store.chaptersCompleted.includes(chapter)
  }, [store.chaptersCompleted])

  const getChapterProgress = useCallback((chapter: number) => {
    return store.getChapterProgress(chapter)
  }, [store])

  return { completeLevel, isLevelUnlocked, isChapterComplete, getChapterProgress, ...store }
}
