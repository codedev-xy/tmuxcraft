import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LevelProgress, StarRating, ChallengeRecord, ChallengeDifficulty } from '@/game/level-types'

interface ProgressState {
  levelProgress: Record<string, LevelProgress>
  achievements: string[]
  challengeRecords: ChallengeRecord[]
  chaptersCompleted: number[]

  completeLevel: (levelId: string, stars: StarRating, commandCount: number) => void
  addChallengeRecord: (record: ChallengeRecord) => void
  getChapterProgress: (chapter: number) => { completed: number; total: number }
  isChallengeUnlocked: (difficulty: ChallengeDifficulty) => boolean
  getLeaderboard: (difficulty: ChallengeDifficulty) => ChallengeRecord[]
  isLevelUnlocked: (levelId: string) => boolean
  resetProgress: () => void
}

const CHAPTER_SIZES: Record<number, number> = { 1: 11, 2: 8, 3: 7 }

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      levelProgress: {},
      achievements: [],
      challengeRecords: [],
      chaptersCompleted: [],

      completeLevel: (levelId, stars, commandCount) => {
        const prev = get().levelProgress[levelId]
        const progress: LevelProgress = {
          levelId,
          completed: true,
          stars: {
            completed: stars.completed || prev?.stars.completed || false,
            efficient: stars.efficient || prev?.stars.efficient || false,
            noHints: stars.noHints || prev?.stars.noHints || false,
          },
          bestCommandCount: prev ? Math.min(prev.bestCommandCount, commandCount) : commandCount,
          attempts: (prev?.attempts || 0) + 1,
          completedAt: new Date().toISOString(),
        }

        const newProgress = { ...get().levelProgress, [levelId]: progress }

        // Check chapter completion
        const chaptersCompleted = [...get().chaptersCompleted]
        for (const [chapter, total] of Object.entries(CHAPTER_SIZES)) {
          const chapterNum = parseInt(chapter)
          const completed = Object.keys(newProgress).filter(id => {
            const [ch] = id.split('-')
            return parseInt(ch) === chapterNum && newProgress[id].completed
          }).length
          if (completed >= total && !chaptersCompleted.includes(chapterNum)) {
            chaptersCompleted.push(chapterNum)
          }
        }

        set({ levelProgress: newProgress, chaptersCompleted })
      },

      addChallengeRecord: (record) => {
        set({ challengeRecords: [...get().challengeRecords, record] })
      },

      getChapterProgress: (chapter) => {
        const total = CHAPTER_SIZES[chapter] || 0
        const completed = Object.keys(get().levelProgress).filter(id => {
          const [ch] = id.split('-')
          return parseInt(ch) === chapter && get().levelProgress[id].completed
        }).length
        return { completed, total }
      },

      isChallengeUnlocked: (difficulty) => {
        const chaptersCompleted = get().chaptersCompleted
        switch (difficulty) {
          case 'beginner': return chaptersCompleted.includes(1)
          case 'intermediate': return chaptersCompleted.includes(2)
          case 'advanced': return chaptersCompleted.includes(3)
          default: return false
        }
      },

      getLeaderboard: (difficulty) => {
        return get().challengeRecords
          .filter(r => r.difficulty === difficulty)
          .sort((a, b) => a.timeSeconds - b.timeSeconds)
      },

      isLevelUnlocked: (levelId) => {
        const [chapterStr, levelStr] = levelId.split('-')
        const chapter = parseInt(chapterStr)
        const level = parseInt(levelStr)
        // First level of first chapter is always unlocked
        if (chapter === 1 && level === 1) return true
        // First level of subsequent chapters requires previous chapter completion
        if (level === 1) return get().chaptersCompleted.includes(chapter - 1)
        // Other levels require the previous level in the same chapter to be completed
        const prevLevelId = `${chapter}-${level - 1}`
        return !!get().levelProgress[prevLevelId]?.completed
      },

      resetProgress: () => set({
        levelProgress: {},
        achievements: [],
        challengeRecords: [],
        chaptersCompleted: [],
      }),
    }),
    {
      name: 'tmuxcraft-progress',
      version: 2,
      migrate: () => ({
        levelProgress: {},
        achievements: [],
        challengeRecords: [],
        chaptersCompleted: [],
      }),
    }
  )
)
