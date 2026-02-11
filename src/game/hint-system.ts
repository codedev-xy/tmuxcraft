import type { LevelDefinition } from './level-types'

export function getHint(level: LevelDefinition, hintLevel: 1 | 2 | 3): string {
  const index = hintLevel - 1
  if (index >= 0 && index < level.hints.length) {
    return level.hints[index]
  }
  return level.hints[level.hints.length - 1] || ''
}

export function getMaxHints(): number {
  return 3
}
