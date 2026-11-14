import type { Tone } from '@/components/ui/tone'
import type { ChallengeDifficulty } from '@/game/level-types'

/** How each difficulty looks wherever it is named. */
export const DIFFICULTY_LOOK: Readonly<Record<ChallengeDifficulty, { emoji: string; tone: Tone }>> = {
  beginner: { emoji: '🌱', tone: 'success' },
  intermediate: { emoji: '⚡', tone: 'warning' },
  advanced: { emoji: '🔥', tone: 'danger' },
}
