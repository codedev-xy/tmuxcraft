import type { StarRating } from './level-types'

export function calculateStars(commandCount: number, optimalSteps: number, hintsUsed: number): StarRating {
  return {
    completed: true,
    efficient: commandCount <= Math.ceil(optimalSteps * 1.5),
    noHints: hintsUsed === 0,
  }
}

export function countStars(stars: StarRating): number {
  return (stars.completed ? 1 : 0) + (stars.efficient ? 1 : 0) + (stars.noHints ? 1 : 0)
}
