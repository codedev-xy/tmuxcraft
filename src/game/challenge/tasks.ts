import { getOption } from '@/core/options'
import type { OptionName } from '@/core/options'
import { getActiveSession, windowPanes } from '@/core/selectors'
import type { Session, TmuxState, Window } from '@/core/types'
import type { ChallengeTask } from '@/game/level-types'
import { isColumn, isEvenColumn, isEvenRow, isGrid, isRow, sessionNamed, windowNamed } from '@/game/levels/predicates'
import { line } from '@/game/sim/inputs'
import type { PlayerInput } from '@/game/sim/simulate'

// Tasks challenges are made of, and the inputs that do them.

/** One pane, or a number of panes side by side (`row`) or stacked (`column`). */
export type Shape = 'single' | 'row' | 'column'

export const SHAPES: readonly Shape[] = ['single', 'row', 'column']
export const SPLIT_SHAPES: readonly Shape[] = ['row', 'column']

const KEY = 'challenge.tasks.'

const SHAPE_KEYS: Readonly<Record<Shape, string>> = { single: 'Single', row: 'Row', column: 'Column' }

const SPLIT_FLAGS: Readonly<Record<Shape, string>> = { single: '', row: '-h', column: '-v' }

type Find = (state: TmuxState) => Window | null

/** The window called `name` in the session the client is in. */
const inCurrentSession = (name: string): Find => state => windowNamed(getActiveSession(state), name)

const inSession = (session: string, name: string): Find => state => windowNamed(sessionNamed(state, session), name)

export function hasShape(window: Window, shape: Shape, count: number): boolean {
  if (shape === 'row') return isRow(window, count)
  if (shape === 'column') return isColumn(window, count)
  return windowPanes(window).length === 1
}

function windowCheck(find: Find, check: (window: Window) => boolean) {
  return (state: TmuxState): boolean => {
    const window = find(state)
    return window !== null && check(window)
  }
}

const countParam = (shape: Shape, count: number): Readonly<Record<string, number>> =>
  (shape === 'single' ? {} : { count })

/** A window of the current session with this shape; `count` is ignored for `single`. */
export function windowShapeTask(name: string, shape: Shape, count = 2): ChallengeTask {
  return {
    id: `window:${name}`,
    key: `${KEY}window${SHAPE_KEYS[shape]}`,
    params: { window: name, ...countParam(shape, count) },
    validate: windowCheck(inCurrentSession(name), window => hasShape(window, shape, count)),
  }
}

export function sessionWindowShapeTask(session: string, name: string, shape: Shape, count = 2): ChallengeTask {
  return {
    id: `window:${session}:${name}`,
    key: `${KEY}sessionWindow${SHAPE_KEYS[shape]}`,
    params: { session, window: name, ...countParam(shape, count) },
    validate: windowCheck(inSession(session, name), window => hasShape(window, shape, count)),
  }
}

export function sessionWindowCountTask(session: string, count: number): ChallengeTask {
  const hasCount = (found: Session | null) => found !== null && found.windows.length === count
  return {
    id: `session:${session}`,
    key: `${KEY}sessionWindowCount`,
    params: { session, count },
    validate: state => hasCount(sessionNamed(state, session)),
  }
}

/** Equal panes in a row (`row`) or a column (`column`). */
export function evenTask(name: string, shape: 'row' | 'column', count: number): ChallengeTask {
  const even = shape === 'row' ? isEvenRow : isEvenColumn
  return {
    id: `window:${name}`,
    key: `${KEY}windowEven${SHAPE_KEYS[shape]}`,
    params: { window: name, count },
    validate: windowCheck(inCurrentSession(name), window => even(window, count)),
  }
}

export function gridTask(name: string): ChallengeTask {
  return {
    id: `window:${name}`,
    key: `${KEY}windowGrid`,
    params: { window: name },
    validate: windowCheck(inCurrentSession(name), window => isGrid(window, 2, 2)),
  }
}

export function syncTask(name: string): ChallengeTask {
  return {
    id: `sync:${name}`,
    key: `${KEY}windowSynced`,
    params: { window: name },
    validate: windowCheck(inCurrentSession(name), window => window.synchronizePanes),
  }
}

export function zoomTask(name: string): ChallengeTask {
  return {
    id: `zoom:${name}`,
    key: `${KEY}windowZoomed`,
    params: { window: name },
    validate: windowCheck(inCurrentSession(name), window => window.zoomed),
  }
}

/** The global option holds exactly `value`. */
export function optionTask(option: OptionName, value: string): ChallengeTask {
  return {
    id: 'option',
    key: `${KEY}option`,
    params: { option, value },
    validate: state => getOption(state, option) === value,
  }
}

/** `bg=<colour>` is one of the parts of `status-style`, which commas or spaces separate. */
export function statusBgTask(colour: string): ChallengeTask {
  return {
    id: 'option',
    key: `${KEY}statusBg`,
    params: { colour },
    validate: state => getOption(state, 'status-style').split(/[,\s]+/).includes(`bg=${colour}`),
  }
}

/** Splits that turn a one-pane window into `count` panes of this shape; `target` is a `-t` target. */
export function splitInputs(shape: Shape, count = 2, target?: string): PlayerInput[] {
  if (shape === 'single') return []
  const where = target ? ` -t ${target}` : ''
  return Array.from({ length: count - 1 }, () => line(`tmux split-window ${SPLIT_FLAGS[shape]}${where}`))
}
