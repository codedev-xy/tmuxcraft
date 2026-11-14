import type { ChallengeDifficulty, ChallengeRecord } from '@/game/level-types'

const faster = (a: ChallengeRecord, b: ChallengeRecord) => a.timeSeconds - b.timeSeconds || a.commandCount - b.commandCount

/** The quickest finished round of a difficulty (fewer commands wins a tie); null when there is none. */
export function bestRecord(records: readonly ChallengeRecord[], difficulty: ChallengeDifficulty): ChallengeRecord | null {
  return records
    .filter(record => record.difficulty === difficulty)
    .reduce<ChallengeRecord | null>((best, record) => (best === null || faster(record, best) < 0 ? record : best), null)
}

/** True when the round beats every earlier round of its difficulty. `records` are the earlier rounds only. */
export function isNewBest(records: readonly ChallengeRecord[], round: ChallengeRecord): boolean {
  const best = bestRecord(records, round.difficulty)
  return best === null || faster(round, best) < 0
}
