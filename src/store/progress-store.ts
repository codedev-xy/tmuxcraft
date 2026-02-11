import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LevelProgress, StarRating, ChallengeRecord, ChallengeDifficulty, AchievementContext } from '@/game/level-types'
import { checkAchievements } from '@/game/achievements'

interface ProgressState {
  levelProgress: Record<string, LevelProgress>
  achievements: string[]
  challengeRecords: ChallengeRecord[]
  chaptersCompleted: number[]
  consecutiveNoHints: number

  completeLevel: (levelId: string, stars: StarRating, commandCount: number) => void
  addAchievement: (id: string) => void
  checkContextAchievements: (context: AchievementContext) => void
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
      consecutiveNoHints: 0,

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

        // Check achievements
        const totalCompleted = Object.values(newProgress).filter(l => l.completed).length
        const totalStars = Object.values(newProgress).reduce((sum, l) => {
          return sum + (l.stars.completed ? 1 : 0) + (l.stars.efficient ? 1 : 0) + (l.stars.noHints ? 1 : 0)
        }, 0)
        const gameProgress = {
          levelProgress: newProgress,
          chaptersCompleted,
          totalLevelsCompleted: totalCompleted,
          totalStarsEarned: totalStars,
        }
        const consecutiveNoHints = stars.noHints ? get().consecutiveNoHints + 1 : 0
        const newAchievements = checkAchievements(gameProgress, get().achievements, { consecutiveNoHints })
        const achievementIds = [...get().achievements, ...newAchievements.map(a => a.id)]

        set({ levelProgress: newProgress, chaptersCompleted, achievements: achievementIds, consecutiveNoHints })
      },

      addAchievement: (id) => {
        if (!get().achievements.includes(id)) {
          set({ achievements: [...get().achievements, id] })
        }
      },

      checkContextAchievements: (context) => {
        const state = get()
        const totalCompleted = Object.values(state.levelProgress).filter(l => l.completed).length
        const totalStars = Object.values(state.levelProgress).reduce((sum, l) => {
          return sum + (l.stars.completed ? 1 : 0) + (l.stars.efficient ? 1 : 0) + (l.stars.noHints ? 1 : 0)
        }, 0)
        const gameProgress = {
          levelProgress: state.levelProgress,
          chaptersCompleted: state.chaptersCompleted,
          totalLevelsCompleted: totalCompleted,
          totalStarsEarned: totalStars,
        }
        const newAchievements = checkAchievements(gameProgress, state.achievements, context)
        if (newAchievements.length > 0) {
          set({ achievements: [...state.achievements, ...newAchievements.map(a => a.id)] })
        }
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
        const chapters = get().chaptersCompleted
        switch (difficulty) {
          case 'beginner': return chapters.includes(1)
          case 'intermediate': return chapters.includes(2)
          case 'advanced': return chapters.includes(3)
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

        // Need previous chapter completed for chapters 2+
        if (level === 1 && chapter > 1) {
          return get().chaptersCompleted.includes(chapter - 1)
        }

        // Need previous level completed
        const prevLevelId = `${chapter}-${level - 1}`
        return get().levelProgress[prevLevelId]?.completed || false
      },

      resetProgress: () => set({
        levelProgress: {},
        achievements: [],
        challengeRecords: [],
        chaptersCompleted: [],
        consecutiveNoHints: 0,
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
        consecutiveNoHints: 0,
      }),
    }
  )
)
