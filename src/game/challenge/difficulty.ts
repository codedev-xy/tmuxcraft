import type { ChallengeDifficulty } from '@/game/level-types'

export const CHALLENGE_DIFFICULTIES: readonly ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced']

/** Seconds the player has for one round. */
export const CHALLENGE_TIME_LIMITS: Readonly<Record<ChallengeDifficulty, number>> = {
  beginner: 60,
  intermediate: 90,
  advanced: 120,
}
