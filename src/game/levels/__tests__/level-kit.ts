import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { simulate } from '@/game/sim/simulate'
import type { PlayerInput } from '@/game/sim/simulate'
import { validateLevel } from '@/game/validator'
import { chapter1Levels } from '../chapter1'
import { chapter2Levels } from '../chapter2'
import { chapter3Levels } from '../chapter3'

export const ALL_LEVELS: readonly LevelDefinition[] = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels]

export function levelById(id: string): LevelDefinition {
  const level = ALL_LEVELS.find(candidate => candidate.id === id)
  if (!level) throw new Error(`no level ${id}`)
  return level
}

/** The level's state after the player does `inputs` from the start. */
export function play(level: LevelDefinition, inputs: readonly PlayerInput[]): TmuxState {
  return simulate(level.initialState, inputs).state
}

/** True when doing `inputs` from the start meets every objective. */
export function completes(level: LevelDefinition, inputs: readonly PlayerInput[]): boolean {
  return validateLevel(play(level, inputs), level).isComplete
}

/** IDs of the objectives met after doing `inputs` from the start. */
export function met(level: LevelDefinition, inputs: readonly PlayerInput[]): string[] {
  return validateLevel(play(level, inputs), level).completedObjectives
}
