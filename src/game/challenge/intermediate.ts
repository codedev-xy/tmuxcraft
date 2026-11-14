import type { ChallengeGoal, ChallengeTask } from '@/game/level-types'
import { line } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { WINDOW_NAMES } from './names'
import { pick, pickDistinct, randomInt } from './random'
import { evenTask, gridTask, SHAPES, SPLIT_SHAPES, splitInputs, syncTask, windowShapeTask, zoomTask } from './tasks'

// Intermediate: one of several kinds, each in a renamed current window.

interface Plan {
  readonly tasks: readonly ChallengeTask[]
  readonly solution: readonly PlayerInput[]
}

type Kind = (random: () => number) => Plan

const rename = (name: string): PlayerInput => line(`tmux rename-window ${name}`)

/** Three or four equal panes in a row or a column: splits, then the even layout. */
const evenKind = (shape: 'row' | 'column'): Kind => random => {
  const name = pick(random, WINDOW_NAMES)
  const count = randomInt(random, 3, 4)
  const layout = shape === 'row' ? 'even-horizontal' : 'even-vertical'
  return {
    tasks: [evenTask(name, shape, count)],
    solution: [rename(name), ...splitInputs(shape, count), line(`tmux select-layout ${layout}`)],
  }
}

/** A 2×2 grid, and a second window of any shape. */
const gridKind: Kind = random => {
  const [grid, other] = pickDistinct(random, WINDOW_NAMES, 2)
  const shape = pick(random, SHAPES)
  return {
    tasks: [gridTask(grid), windowShapeTask(other, shape)],
    solution: [
      rename(grid),
      line('tmux split-window -h'),
      line('tmux split-window -v'),
      line('tmux select-pane -L'),
      line('tmux split-window -v'),
      line(`tmux new-window -n ${other}`),
      ...splitInputs(shape),
    ],
  }
}

/** Two or three panes in a row or a column, finished by `command`. */
const splitThen = (task: (name: string) => ChallengeTask, command: string): Kind => random => {
  const name = pick(random, WINDOW_NAMES)
  const shape = pick(random, SPLIT_SHAPES)
  const count = randomInt(random, 2, 3)
  return {
    tasks: [windowShapeTask(name, shape, count), task(name)],
    solution: [rename(name), ...splitInputs(shape, count), line(command)],
  }
}

const KINDS: readonly Kind[] = [
  evenKind('row'),
  evenKind('column'),
  gridKind,
  splitThen(syncTask, 'tmux setw synchronize-panes on'),
  splitThen(zoomTask, 'tmux resize-pane -Z'),
]

export function generateIntermediate(random: () => number): ChallengeGoal {
  const plan = pick(random, KINDS)(random)
  return { difficulty: 'intermediate', tasks: plan.tasks, solution: plan.solution }
}
