import type { ChallengeDifficulty, ChallengeRecord, LevelProgress, StarRating } from '@/game/level-types'

export const PROGRESS_VERSION = 3

export interface SavedProgress {
  levelProgress: Record<string, LevelProgress>
  challengeRecords: ChallengeRecord[]
}

type Fields = Record<string, unknown>

const DIFFICULTIES: readonly string[] = ['beginner', 'intermediate', 'advanced'] satisfies readonly ChallengeDifficulty[]
const LEVEL_ID = /^\d+-\d+$/

const isFields = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value)
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

function readStars(value: unknown): StarRating | null {
  if (!isFields(value)) return null
  const { completed, efficient, noHints } = value
  if (typeof completed !== 'boolean' || typeof efficient !== 'boolean' || typeof noHints !== 'boolean') return null
  return { completed, efficient, noHints }
}

function readLevel(levelId: string, value: unknown): LevelProgress | null {
  if (!LEVEL_ID.test(levelId) || !isFields(value)) return null
  const stars = readStars(value.stars)
  const { completed, bestCommandCount, attempts, completedAt } = value
  if (stars === null || typeof completed !== 'boolean' || !isCount(bestCommandCount) || !isCount(attempts)) return null
  return { levelId, completed, stars, bestCommandCount, attempts, ...(typeof completedAt === 'string' ? { completedAt } : {}) }
}

function readRecord(value: unknown): ChallengeRecord | null {
  if (!isFields(value)) return null
  const { difficulty, completedAt, timeSeconds, commandCount, targetDescription } = value
  if (typeof difficulty !== 'string' || !DIFFICULTIES.includes(difficulty)) return null
  if (typeof completedAt !== 'string' || !isCount(timeSeconds) || !isCount(commandCount)) return null
  return {
    difficulty: difficulty as ChallengeDifficulty,
    completedAt,
    timeSeconds,
    commandCount,
    ...(typeof targetDescription === 'string' ? { targetDescription } : {}),
  }
}

/** What an older save becomes: its level progress and challenge records, minus anything unreadable. */
export function migrateProgress(saved: unknown): SavedProgress {
  const fields = isFields(saved) ? saved : {}
  const levels = isFields(fields.levelProgress) ? fields.levelProgress : {}
  const records = Array.isArray(fields.challengeRecords) ? fields.challengeRecords : []
  return {
    levelProgress: Object.fromEntries(
      Object.entries(levels).flatMap(([levelId, value]) => {
        const level = readLevel(levelId, value)
        return level ? [[levelId, level]] : []
      }),
    ),
    challengeRecords: records.flatMap(value => readRecord(value) ?? []),
  }
}
