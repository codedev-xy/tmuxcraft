import { CHAPTERS } from '@/game/chapters'
import type { Chapter, ChapterId } from '@/game/chapters'

export const CHAPTER_EMOJI: Readonly<Record<ChapterId, string>> = { 1: '🌱', 2: '⚡', 3: '🎨' }

export const chapterTitleKey = (id: ChapterId) => `chapters.chapter${id}.title`

export const chapterDescriptionKey = (id: ChapterId) => `chapters.chapter${id}.description`

/** The chapter with this id; the first chapter when there is none. */
export function chapterById(id: number): Chapter {
  return CHAPTERS.find(chapter => chapter.id === id) ?? CHAPTERS[0]
}
