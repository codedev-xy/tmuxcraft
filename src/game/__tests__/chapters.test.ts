import { describe, it, expect } from 'vitest'
import type { LevelProgress } from '../level-types'
import { ALL_LEVELS, CHAPTERS, chapterStars, levelAfter, nextUnfinished, totalStars } from '../chapters'

const done = (levelId: string, stars = 3): LevelProgress => ({
  levelId,
  completed: true,
  stars: { completed: stars >= 1, efficient: stars >= 2, noHints: stars >= 3 },
  bestCommandCount: 1,
  attempts: 1,
})

const progressOf = (...entries: LevelProgress[]) => Object.fromEntries(entries.map(entry => [entry.levelId, entry]))

describe('chapters', () => {
  it('lists the three chapters with their levels in order', () => {
    expect(CHAPTERS.map(chapter => [chapter.id, chapter.levels.length])).toEqual([[1, 11], [2, 8], [3, 7]])
    expect(ALL_LEVELS).toHaveLength(26)
    expect(ALL_LEVELS[0].id).toBe('1-1')
    expect(ALL_LEVELS[25].id).toBe('3-7')
    for (const chapter of CHAPTERS) expect(chapter.levels.every(level => level.chapter === chapter.id)).toBe(true)
  })

  it('finds the level after a level, across chapters', () => {
    expect(levelAfter('1-1')?.id).toBe('1-2')
    expect(levelAfter('1-11')?.id).toBe('2-1')
    expect(levelAfter('3-7')).toBeNull()
    expect(levelAfter('9-9')).toBeNull()
  })

  it('finds the first level not completed yet', () => {
    expect(nextUnfinished({})?.id).toBe('1-1')
    expect(nextUnfinished(progressOf(done('1-1'), done('1-2')))?.id).toBe('1-3')
    expect(nextUnfinished(progressOf(done('1-1'), done('1-3')))?.id).toBe('1-2')
    expect(nextUnfinished(progressOf({ ...done('1-1'), completed: false }))?.id).toBe('1-1')
    expect(nextUnfinished(progressOf(...ALL_LEVELS.map(level => done(level.id))))).toBeNull()
  })

  it('finds the first level not completed yet within one chapter', () => {
    expect(nextUnfinished(progressOf(done('2-1')), 2)?.id).toBe('2-2')
    expect(nextUnfinished(progressOf(...CHAPTERS[0].levels.map(level => done(level.id))), 1)).toBeNull()
  })

  it('adds up stars, for everything and for one chapter', () => {
    const progress = progressOf(done('1-1', 3), done('1-2', 1), done('2-1', 2))
    expect(totalStars(progress)).toBe(6)
    expect(chapterStars(progress, 1)).toBe(4)
    expect(chapterStars(progress, 2)).toBe(2)
    expect(chapterStars(progress, 3)).toBe(0)
  })

  it('ignores saved progress for levels that no longer exist', () => {
    expect(totalStars(progressOf(done('7-1', 3)))).toBe(0)
  })
})
