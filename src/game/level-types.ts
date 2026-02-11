import type { TmuxState, LayoutNode, CommandType } from '@/core/types'

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
  availableCommands: CommandType[]   // commands allowed in this level
  objectives: LevelObjective[]      // what needs to be accomplished
  hints: [string, string, string]   // 3 hint i18n keys (progressive)
  optimalSteps: number              // minimum steps to complete
  tutorialSteps?: TutorialStep[]    // for tutorial type levels
}

export interface LevelObjective {
  id: string
  descriptionKey: string            // i18n key
  validate: (state: TmuxState) => boolean
}

export interface TutorialStep {
  messageKey: string                // i18n key for instruction text
  highlightElement?: string         // CSS selector to highlight
  expectedCommand?: CommandType     // wait for this command
  autoAdvance?: boolean             // auto-advance after delay
}

export interface ChapterDefinition {
  id: number
  titleKey: string
  descriptionKey: string
  levels: LevelDefinition[]
  unlockCondition?: number          // chapter number that must be completed first
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

export interface GameProgress {
  levelProgress: Record<string, LevelProgress>
  chaptersCompleted: number[]
  totalLevelsCompleted: number
  totalStarsEarned: number
}

// ===== Achievements =====

export interface Achievement {
  id: string
  titleKey: string
  descriptionKey: string
  icon: string
  condition: (progress: GameProgress, context?: AchievementContext) => boolean
}

export interface AchievementContext {
  currentPaneCount?: number
  currentCombo?: number
  consecutiveNoHints?: number
  challengeTime?: number
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

export interface ChallengeTemplate {
  id: string
  difficulty: ChallengeDifficulty
  requiredCommands: CommandType[]
  descriptionTemplate: string       // template with {{placeholders}}
  generate: (seed?: number) => ChallengeGoal
}

export interface ChallengeRecord {
  username: string
  difficulty: ChallengeDifficulty
  completedAt: string               // ISO timestamp
  timeSeconds: number
  commandCount: number
  targetDescription: string
}

export interface ChallengeConfig {
  beginner: { timeLimit: 60; commandPool: CommandType[] }
  intermediate: { timeLimit: 90; commandPool: CommandType[] }
  advanced: { timeLimit: 120; commandPool: CommandType[] }
}

// ===== Validation =====

export interface ValidationResult {
  isComplete: boolean
  progress: number                  // 0-1
  completedObjectives: string[]
  remainingObjectives: string[]
}

// ===== User Settings =====

export interface UserSettings {
  username: string
  language: 'zh' | 'en'
  soundEnabled: boolean
  isFirstVisit: boolean
}

// ===== Layout Comparison =====

export interface LayoutComparison {
  match: number                     // 0-1 similarity score
  differences: LayoutDifference[]
}

export interface LayoutDifference {
  type: 'missing_pane' | 'extra_pane' | 'wrong_direction' | 'wrong_ratio' | 'wrong_name'
  description: string
  paneId?: string
}
