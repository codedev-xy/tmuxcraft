import type { LevelDefinition } from '@/game/level-types'
import { INPUT_LEVELS } from './input'
import { PANE_LEVELS } from './panes'
import { SESSION_LEVELS } from './sessions'

export const chapter2Levels: LevelDefinition[] = [...PANE_LEVELS, ...INPUT_LEVELS, ...SESSION_LEVELS]

export default chapter2Levels
