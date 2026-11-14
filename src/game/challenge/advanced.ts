import type { ChallengeGoal, ChallengeTask } from '@/game/level-types'
import { line } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'
import { SESSION_NAMES, STATUS_COLOURS, WINDOW_NAMES } from './names'
import { pick, pickDistinct, randomInt } from './random'
import { optionTask, SHAPES, sessionWindowCountTask, sessionWindowShapeTask, splitInputs, statusBgTask } from './tasks'
import type { Shape } from './tasks'

// Advanced: two named sessions, the first with two named windows and the second with one or two,
// every window with a shape; plus one global option.

interface PlannedWindow {
  readonly name: string
  readonly shape: Shape
}

interface PlannedSession {
  readonly name: string
  readonly windows: readonly PlannedWindow[]
}

interface OptionPlan {
  readonly task: ChallengeTask
  readonly input: PlayerInput
}

const OPTIONS: readonly ((random: () => number) => OptionPlan)[] = [
  () => ({ task: optionTask('mouse', 'on'), input: line('tmux set -g mouse on') }),
  () => ({ task: optionTask('status-position', 'top'), input: line('tmux set -g status-position top') }),
  () => ({ task: optionTask('mode-keys', 'vi'), input: line('tmux set -g mode-keys vi') }),
  random => {
    const colour = pick(random, STATUS_COLOURS)
    return { task: statusBgTask(colour), input: line(`tmux set -g status-style bg=${colour}`) }
  },
]

function drawSessions(random: () => number): PlannedSession[] {
  const [first, second] = pickDistinct(random, SESSION_NAMES, 2)
  const secondCount = randomInt(random, 1, 2)
  const names = pickDistinct(random, WINDOW_NAMES, 2 + secondCount)
  const windows = names.map(name => ({ name, shape: pick(random, SHAPES) }))
  return [{ name: first, windows: windows.slice(0, 2) }, { name: second, windows: windows.slice(2) }]
}

function sessionTasks(session: PlannedSession): ChallengeTask[] {
  return [
    sessionWindowCountTask(session.name, session.windows.length),
    ...session.windows.map(window => sessionWindowShapeTask(session.name, window.name, window.shape)),
  ]
}

/** The first session is the one the client is in, renamed; its windows are made in place. */
function firstSessionInputs(session: PlannedSession): PlayerInput[] {
  return [
    line(`tmux rename-session ${session.name}`),
    ...session.windows.flatMap((window, index) => [
      line(index === 0 ? `tmux rename-window ${window.name}` : `tmux new-window -n ${window.name}`),
      ...splitInputs(window.shape),
    ]),
  ]
}

/** The second session is made in the background; its windows are reached with `session:window` targets. */
function secondSessionInputs(session: PlannedSession): PlayerInput[] {
  return session.windows.flatMap((window, index) => [
    line(index === 0
      ? `tmux new -d -s ${session.name} -n ${window.name}`
      : `tmux new-window -d -t ${session.name}: -n ${window.name}`),
    ...splitInputs(window.shape, 2, `${session.name}:${window.name}`),
  ])
}

export function generateAdvanced(random: () => number): ChallengeGoal {
  const [first, second] = drawSessions(random)
  const option = pick(random, OPTIONS)(random)
  return {
    difficulty: 'advanced',
    tasks: [...sessionTasks(first), ...sessionTasks(second), option.task],
    solution: [...firstSessionInputs(first), ...secondSessionInputs(second), option.input],
  }
}
