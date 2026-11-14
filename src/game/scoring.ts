import type { StarRating } from './level-types'

/** The most commands that still earn the efficient star. */
export function efficientBudget(optimalSteps: number): number {
  return Math.ceil(optimalSteps * 1.5)
}

export function calculateStars(commandCount: number, optimalSteps: number, hintsUsed: number): StarRating {
  return {
    completed: true,
    efficient: commandCount <= efficientBudget(optimalSteps),
    noHints: hintsUsed === 0,
  }
}

export function countStars(stars: StarRating): number {
  return (stars.completed ? 1 : 0) + (stars.efficient ? 1 : 0) + (stars.noHints ? 1 : 0)
}
