import type { Achievement, AchievementContext, GameProgress } from './level-types'

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'beginner',
    titleKey: 'achievements.beginner.title',
    descriptionKey: 'achievements.beginner.description',
    icon: '🎯',
    condition: (p) => p.totalLevelsCompleted >= 1,
  },
  {
    id: 'paneMaster',
    titleKey: 'achievements.paneMaster.title',
    descriptionKey: 'achievements.paneMaster.description',
    icon: '🔲',
    condition: (_p, ctx) => (ctx?.currentPaneCount ?? 0) >= 6,
  },
  {
    id: 'speedStar',
    titleKey: 'achievements.speedStar.title',
    descriptionKey: 'achievements.speedStar.description',
    icon: '⚡',
    condition: (p) => Object.values(p.levelProgress).some(l => l.stars.efficient),
  },
  {
    id: 'perfectionist',
    titleKey: 'achievements.perfectionist.title',
    descriptionKey: 'achievements.perfectionist.description',
    icon: '⭐',
    condition: (p) => Object.values(p.levelProgress).some(l => l.stars.completed && l.stars.efficient && l.stars.noHints),
  },
  {
    id: 'chapter1Complete',
    titleKey: 'achievements.chapter1Complete.title',
    descriptionKey: 'achievements.chapter1Complete.description',
    icon: '📗',
    condition: (p) => p.chaptersCompleted.includes(1),
  },
  {
    id: 'chapter2Complete',
    titleKey: 'achievements.chapter2Complete.title',
    descriptionKey: 'achievements.chapter2Complete.description',
    icon: '📘',
    condition: (p) => p.chaptersCompleted.includes(2),
  },
  {
    id: 'chapter3Complete',
    titleKey: 'achievements.chapter3Complete.title',
    descriptionKey: 'achievements.chapter3Complete.description',
    icon: '📕',
    condition: (p) => p.chaptersCompleted.includes(3),
  },
  {
    id: 'allComplete',
    titleKey: 'achievements.allComplete.title',
    descriptionKey: 'achievements.allComplete.description',
    icon: '🏆',
    condition: (p) => p.chaptersCompleted.includes(1) && p.chaptersCompleted.includes(2) && p.chaptersCompleted.includes(3),
  },
  {
    id: 'challenger',
    titleKey: 'achievements.challenger.title',
    descriptionKey: 'achievements.challenger.description',
    icon: '🎮',
    condition: (_p, ctx) => (ctx?.challengeTime ?? Infinity) < Infinity,
  },
  {
    id: 'lightning',
    titleKey: 'achievements.lightning.title',
    descriptionKey: 'achievements.lightning.description',
    icon: '⚡',
    condition: (_p, ctx) => (ctx?.challengeTime ?? Infinity) <= 30,
  },
  {
    id: 'noHints10',
    titleKey: 'achievements.noHints10.title',
    descriptionKey: 'achievements.noHints10.description',
    icon: '🧠',
    condition: (_p, ctx) => (ctx?.consecutiveNoHints ?? 0) >= 10,
  },
  {
    id: 'combo5',
    titleKey: 'achievements.combo5.title',
    descriptionKey: 'achievements.combo5.description',
    icon: '🔥',
    condition: (_p, ctx) => (ctx?.currentCombo ?? 0) >= 5,
  },
  {
    id: 'combo10',
    titleKey: 'achievements.combo10.title',
    descriptionKey: 'achievements.combo10.description',
    icon: '💥',
    condition: (_p, ctx) => (ctx?.currentCombo ?? 0) >= 10,
  },
  {
    id: 'allStars',
    titleKey: 'achievements.allStars.title',
    descriptionKey: 'achievements.allStars.description',
    icon: '🌟',
    condition: (p) => p.totalStarsEarned >= 90,
  },
  {
    id: 'dedication',
    titleKey: 'achievements.dedication.title',
    descriptionKey: 'achievements.dedication.description',
    icon: '💪',
    condition: (p) => p.totalLevelsCompleted >= 50,
  },
]

export function checkAchievements(
  progress: GameProgress,
  unlockedIds: string[],
  context?: AchievementContext
): Achievement[] {
  return ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id) && a.condition(progress, context))
}
