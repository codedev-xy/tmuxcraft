import type { TmuxState } from '@/core/types'
import type { LevelDefinition, ValidationResult } from './level-types'

export function validateLevel(currentState: TmuxState, level: LevelDefinition): ValidationResult {
  const completedObjectives: string[] = []
  const remainingObjectives: string[] = []

  for (const objective of level.objectives) {
    if (objective.validate(currentState)) {
      completedObjectives.push(objective.id)
    } else {
      remainingObjectives.push(objective.id)
    }
  }

  const total = level.objectives.length
  return {
    isComplete: remainingObjectives.length === 0 && total > 0,
    progress: total > 0 ? completedObjectives.length / total : 0,
    completedObjectives,
    remainingObjectives,
  }
}
