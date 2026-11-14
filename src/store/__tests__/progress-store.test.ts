import { beforeEach, describe, expect, it } from 'vitest'
import type { ChallengeRecord, LevelProgress } from '@/game/level-types'
import { migrateProgress } from '../progress-migrate'
import { useProgressStore } from '../progress-store'

const STORAGE_KEY = 'tmuxcraft-progress'

const cleared: LevelProgress = {
  levelId: '1-1',
  completed: true,
  stars: { completed: true, efficient: true, noHints: false },
  bestCommandCount: 2,
  attempts: 3,
  completedAt: '2026-01-02T03:04:05.000Z',
}

const record: ChallengeRecord = {
  difficulty: 'beginner',
  completedAt: '2026-01-03T00:00:00.000Z',
  timeSeconds: 41,
  commandCount: 7,
  targetDescription: '创建 2 个窗口',
}

const v2Save = {
  levelProgress: { '1-1': cleared },
  achievements: ['first-split'],
  challengeRecords: [record],
  chaptersCompleted: [1],
}

describe('migrateProgress', () => {
  it('keeps level progress and challenge records from a v2 save, and drops the rest', () => {
    expect(migrateProgress(v2Save)).toEqual({ levelProgress: { '1-1': cleared }, challengeRecords: [record] })
  })

  it('keeps a v1 record, without the user name it used to carry', () => {
    const migrated = migrateProgress({ ...v2Save, challengeRecords: [{ ...record, username: 'ada' }] })
    expect(migrated.challengeRecords).toEqual([record])
  })

  it.each([null, undefined, 'x', 7, [], {}])('starts empty from %j', saved => {
    expect(migrateProgress(saved)).toEqual({ levelProgress: {}, challengeRecords: [] })
  })

  it('drops level entries it cannot read, and keeps the good ones', () => {
    const migrated = migrateProgress({
      levelProgress: {
        '1-1': cleared,
        '1-2': { ...cleared, stars: undefined },
        '1-3': { ...cleared, bestCommandCount: 'two' },
        '1-4': null,
        'not-a-level': cleared,
      },
    })
    expect(Object.keys(migrated.levelProgress)).toEqual(['1-1'])
  })

  it('files each level under its own id', () => {
    const migrated = migrateProgress({ levelProgress: { '2-3': { ...cleared, levelId: '1-1' } } })
    expect(migrated.levelProgress['2-3'].levelId).toBe('2-3')
  })

  it('drops challenge records it cannot read', () => {
    const migrated = migrateProgress({
      challengeRecords: [record, { ...record, difficulty: 'impossible' }, { ...record, timeSeconds: null }, 'x'],
    })
    expect(migrated.challengeRecords).toEqual([record])
  })
})

describe('useProgressStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.getState().resetProgress()
  })

  it('loads a v2 save without losing the stars', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: v2Save, version: 2 }))
    await useProgressStore.persist.rehydrate()
    const state = useProgressStore.getState()
    expect(state.levelProgress).toEqual({ '1-1': cleared })
    expect(state.challengeRecords).toEqual([record])
    expect(state).not.toHaveProperty('achievements')
  })

  it('saves as version 3 with only progress and records', () => {
    useProgressStore.getState().completeLevel('1-1', cleared.stars, 2)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.version).toBe(3)
    expect(Object.keys(saved.state).sort()).toEqual(['challengeRecords', 'levelProgress'])
  })

  it('never takes a star back and keeps the best step count', () => {
    const { completeLevel } = useProgressStore.getState()
    completeLevel('1-1', { completed: true, efficient: true, noHints: false }, 4)
    completeLevel('1-1', { completed: true, efficient: false, noHints: true }, 9)
    const progress = useProgressStore.getState().levelProgress['1-1']
    expect(progress.stars).toEqual({ completed: true, efficient: true, noHints: true })
    expect(progress.bestCommandCount).toBe(4)
    expect(progress.attempts).toBe(2)
  })

  it('appends challenge records and clears everything on reset', () => {
    useProgressStore.getState().addChallengeRecord(record)
    useProgressStore.getState().completeLevel('1-1', cleared.stars, 2)
    expect(useProgressStore.getState().challengeRecords).toEqual([record])
    useProgressStore.getState().resetProgress()
    expect(useProgressStore.getState().levelProgress).toEqual({})
    expect(useProgressStore.getState().challengeRecords).toEqual([])
  })
})
