import type { LevelDefinition } from '@/game/level-types'
import { paneLevels } from './panes'
import { windowLevels } from './windows'

export const chapter1Levels: LevelDefinition[] = [...paneLevels, ...windowLevels]

export default chapter1Levels
