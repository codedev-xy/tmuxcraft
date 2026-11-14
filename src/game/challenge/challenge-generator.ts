import type { TmuxState } from '@/core/types'
import type { ChallengeDifficulty, ChallengeGoal } from '@/game/level-types'
import { generateAdvanced } from './advanced'
import { generateBeginner } from './beginner'
import { generateIntermediate } from './intermediate'

const GENERATORS: Readonly<Record<ChallengeDifficulty, (random: () => number) => ChallengeGoal>> = {
  beginner: generateBeginner,
  intermediate: generateIntermediate,
  advanced: generateAdvanced,
}

/** A random goal of this difficulty, to be done from `defaultState()`; pass `seededRandom(seed)` to repeat one. */
export function generateChallenge(difficulty: ChallengeDifficulty, random: () => number = Math.random): ChallengeGoal {
  return GENERATORS[difficulty](random)
}

/** True when every task of the goal holds in `state`. */
export function challengeComplete(goal: ChallengeGoal, state: TmuxState): boolean {
  return goal.tasks.every(task => task.validate(state))
}
