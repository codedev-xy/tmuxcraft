import type { ChallengeGoal } from '@/game/level-types'
import { line } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { WINDOW_NAMES } from './names'
import { pick, pickDistinct, randomInt } from './random'
import { SHAPES, SPLIT_SHAPES, splitInputs, windowShapeTask } from './tasks'
import type { Shape } from './tasks'

// Beginner: two or three named windows in the current session, each one pane, two side by side or two stacked.
// Other windows may stay; only the named ones are checked.

interface PlannedWindow {
  readonly name: string
  readonly shape: Shape
}

/** Window shapes with at least one split, so every round asks for a direction. */
function drawShapes(random: () => number, count: number): Shape[] {
  const split = randomInt(random, 0, count - 1)
  return Array.from({ length: count }, (_, index) => pick(random, index === split ? SPLIT_SHAPES : SHAPES))
}

function windowInputs(window: PlannedWindow, index: number): PlayerInput[] {
  const create = index === 0 ? `tmux rename-window ${window.name}` : `tmux new-window -n ${window.name}`
  return [line(create), ...splitInputs(window.shape)]
}

export function generateBeginner(random: () => number): ChallengeGoal {
  const count = randomInt(random, 2, 3)
  const names = pickDistinct(random, WINDOW_NAMES, count)
  const shapes = drawShapes(random, count)
  const windows = names.map((name, index) => ({ name, shape: shapes[index] }))
  return {
    difficulty: 'beginner',
    tasks: windows.map(window => windowShapeTask(window.name, window.shape)),
    solution: windows.flatMap(windowInputs),
  }
}
