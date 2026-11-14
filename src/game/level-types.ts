import type { TmuxState } from '@/core/types'
import type { PlayerInput } from '@/game/sim/simulate'

// ===== Level Types =====

export type LevelType =
  | 'tutorial'
  | 'layout_puzzle'
  | 'navigation'
  | 'workspace'
  | 'text_task'
  | 'fix_layout'

export interface LevelDefinition {
  id: string                        // e.g. "1-1", "2-3"
  chapter: number                   // 1, 2, or 3
  level: number                     // level number within chapter
  titleKey: string                  // i18n key for title
  descriptionKey: string            // i18n key for description
  type: LevelType
  initialState: TmuxState           // starting state
  objectives: LevelObjective[]      // what needs to be accomplished
  hints: [string, string, string]   // 3 hint i18n keys (progressive)
  /** How many steps the reference solution takes. Stars are scored against this. */
  optimalSteps: number
  /** The way the hints teach, as the player would do it. It completes the level in `optimalSteps` steps. */
  solution: readonly PlayerInput[]
  /** A walk-through shown in the objectives panel, for levels with more than one move. */
  tutorialSteps?: TutorialStep[]
}

export interface LevelObjective {
  id: string
  descriptionKey: string            // i18n key
  validate: (state: TmuxState) => boolean
}

export interface TutorialStep {
  messageKey: string                // i18n key for instruction text
  /** True once the player has done this step, so the panel can tick it and point at the next. */
  done: (state: TmuxState) => boolean
}

// ===== Progress & Scoring =====

export interface StarRating {
  completed: boolean
  efficient: boolean
  noHints: boolean
}

export interface LevelProgress {
  levelId: string
  completed: boolean
  stars: StarRating
  bestCommandCount: number
  attempts: number
  completedAt?: string              // ISO timestamp
}

// ===== Challenge Mode =====

export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ChallengeGoal {
  description: string
  descriptionKey?: string
  targetState: Partial<TmuxState>
  validate: (state: TmuxState) => boolean
  optimalSteps: number
}

export interface ChallengeRecord {
  difficulty: ChallengeDifficulty
  completedAt: string               // ISO timestamp
  timeSeconds: number
  commandCount: number
  targetDescription: string
}

// ===== Validation =====

export interface ValidationResult {
  isComplete: boolean
  progress: number                  // 0-1
  completedObjectives: string[]
  remainingObjectives: string[]
}
