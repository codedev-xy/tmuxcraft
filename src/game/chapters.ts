import type { LevelDefinition, LevelProgress } from './level-types'
import { countStars } from './scoring'
import { chapter1Levels } from './levels/chapter1'
import { chapter2Levels } from './levels/chapter2'
import { chapter3Levels } from './levels/chapter3'

export type ChapterId = 1 | 2 | 3

export interface Chapter {
  id: ChapterId
  levels: readonly LevelDefinition[]
}

export type ProgressMap = Readonly<Record<string, LevelProgress>>

export const CHAPTERS: readonly Chapter[] = [
  { id: 1, levels: chapter1Levels },
  { id: 2, levels: chapter2Levels },
  { id: 3, levels: chapter3Levels },
]

export const ALL_LEVELS: readonly LevelDefinition[] = CHAPTERS.flatMap(chapter => chapter.levels)

export const STARS_PER_LEVEL = 3

function levelsOf(chapter?: number): readonly LevelDefinition[] {
  return chapter === undefined ? ALL_LEVELS : (CHAPTERS.find(entry => entry.id === chapter)?.levels ?? [])
}

export function findLevel(levelId: string): LevelDefinition | null {
  return ALL_LEVELS.find(level => level.id === levelId) ?? null
}

/** The level played after `levelId`, crossing into the next chapter; null after the last one. */
export function levelAfter(levelId: string): LevelDefinition | null {
  const index = ALL_LEVELS.findIndex(level => level.id === levelId)
  return index === -1 ? null : (ALL_LEVELS[index + 1] ?? null)
}

/** The first level, in order, that is not completed yet: in one chapter, or in the whole game. */
export function nextUnfinished(progress: ProgressMap, chapter?: number): LevelDefinition | null {
  return levelsOf(chapter).find(level => !progress[level.id]?.completed) ?? null
}

export function completedCount(progress: ProgressMap, chapter?: number): number {
  return levelsOf(chapter).filter(level => progress[level.id]?.completed).length
}

function starsIn(progress: ProgressMap, levels: readonly LevelDefinition[]): number {
  return levels.reduce((sum, level) => sum + (progress[level.id] ? countStars(progress[level.id].stars) : 0), 0)
}

export function totalStars(progress: ProgressMap): number {
  return starsIn(progress, ALL_LEVELS)
}

export function chapterStars(progress: ProgressMap, chapter: number): number {
  return starsIn(progress, levelsOf(chapter))
}
