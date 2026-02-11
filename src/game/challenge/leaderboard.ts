import type { ChallengeRecord, ChallengeDifficulty } from '../level-types'

const STORAGE_KEY = 'tmuxcraft-leaderboard'

export function addRecord(record: ChallengeRecord): void {
  const records = getAllRecords()
  records.push(record)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function getRecords(difficulty: ChallengeDifficulty): ChallengeRecord[] {
  return getAllRecords()
    .filter(r => r.difficulty === difficulty)
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
}

export function getAllRecords(): ChallengeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
