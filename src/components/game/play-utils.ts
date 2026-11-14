import type { ValidationResult } from '@/game/level-types'

/** Objectives shown as done. Nothing counts before the first command, so a level never starts half-solved. */
export function shownObjectives(validation: ValidationResult, commandCount: number): readonly string[] {
  return commandCount > 0 ? validation.completedObjectives : []
}
