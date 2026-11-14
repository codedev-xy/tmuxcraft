import { describe, expect, it } from 'vitest'
import type { ChallengeRecord } from '@/game/level-types'
import { bestRecord, isNewBest } from '../records'

const record = (difficulty: ChallengeRecord['difficulty'], timeSeconds: number, commandCount: number): ChallengeRecord => ({
  difficulty,
  timeSeconds,
  commandCount,
  completedAt: '2026-01-01T00:00:00.000Z',
})

describe('bestRecord', () => {
  it('is null when the difficulty was never finished', () => {
    expect(bestRecord([], 'beginner')).toBeNull()
    expect(bestRecord([record('advanced', 50, 9)], 'beginner')).toBeNull()
  })

  it('is the fastest round of that difficulty', () => {
    const records = [record('beginner', 40, 6), record('beginner', 31, 9), record('advanced', 12, 3)]
    expect(bestRecord(records, 'beginner')).toBe(records[1])
  })

  it('breaks a tie on time by the fewer commands, then by the earlier round', () => {
    const records = [record('beginner', 31, 9), record('beginner', 31, 7), record('beginner', 31, 7)]
    expect(bestRecord(records, 'beginner')).toBe(records[1])
  })
})

describe('isNewBest', () => {
  it('is true for the first finished round of a difficulty', () => {
    expect(isNewBest([record('advanced', 5, 2)], record('beginner', 59, 20))).toBe(true)
  })

  it('is true for a faster round, or as fast with fewer commands', () => {
    const records = [record('beginner', 31, 7)]
    expect(isNewBest(records, record('beginner', 30, 12))).toBe(true)
    expect(isNewBest(records, record('beginner', 31, 6))).toBe(true)
  })

  it('is false for a round that only equals the best or is behind it', () => {
    const records = [record('beginner', 31, 7)]
    expect(isNewBest(records, record('beginner', 31, 7))).toBe(false)
    expect(isNewBest(records, record('beginner', 31, 8))).toBe(false)
    expect(isNewBest(records, record('beginner', 32, 1))).toBe(false)
  })
})
