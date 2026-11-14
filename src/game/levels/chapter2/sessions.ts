import { windowPanes } from '@/core/selectors'
import type { TmuxState, Window } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line } from '@/game/sim/inputs'
import { singlePaneState } from '../helpers'
import { attachedTo, isEvenRow, sessionNamed, windowNamed } from '../predicates'

// Levels 2-7 and 2-8: more than one session.

const hasSession = (name: string) => (state: TmuxState): boolean => sessionNamed(state, name) !== null

/** The session the level starts in, whatever it is called now. */
const startingSession = (state: TmuxState) => state.sessions.find(session => session.id === 's1') ?? null

/** All three exist, and 'default' is still the session the level started with. */
const allThreeSessions = (state: TmuxState): boolean =>
  ['default', 'dev', 'staging'].every(name => hasSession(name)(state)) && startingSession(state)?.name === 'default'

const level2_7: LevelDefinition = {
  id: '2-7',
  chapter: 2,
  level: 7,
  titleKey: 'levels.2-7.title',
  descriptionKey: 'levels.2-7.description',
  type: 'navigation',
  initialState: singlePaneState('default'),
  objectives: [
    { id: 'sessions', descriptionKey: 'game.objectives.2-7-sessions', validate: allThreeSessions },
    { id: 'switch', descriptionKey: 'game.objectives.2-7-switch', validate: state => attachedTo(state, 'dev') },
  ],
  hints: ['game.hints.2-7-1', 'game.hints.2-7-2', 'game.hints.2-7-3'],
  optimalSteps: 3,
  solution: [line('tmux new -d -s dev'), line('tmux new -d -s staging'), line('tmux switch-client -t dev')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.2-7-step1', done: hasSession('dev') },
    { messageKey: 'game.tutorial.2-7-step2', done: state => hasSession('dev')(state) && hasSession('staging')(state) },
    { messageKey: 'game.tutorial.2-7-step3', done: state => allThreeSessions(state) && attachedTo(state, 'dev') },
  ],
}

// 2-8: session 'debug' with window 'services' (three equal panes side by side, synchronized) and window 'db'.

const services = (state: TmuxState) => windowNamed(sessionNamed(state, 'debug'), 'services')

/** The client is in 'debug', and 'debug' is a session the player created, not the starting one renamed. */
const inDebug = (state: TmuxState): boolean => attachedTo(state, 'debug') && startingSession(state)?.name !== 'debug'
const servicesExists = (state: TmuxState): boolean => services(state) !== null
const threePanes = (state: TmuxState): boolean => {
  const window = services(state)
  return window !== null && isEvenRow(window, 3)
}
const paneCount = (window: Window | null): number => (window ? windowPanes(window).length : 0)
const servicesSynced = (state: TmuxState): boolean => services(state)?.synchronizePanes === true
const hasDb = (state: TmuxState): boolean => windowNamed(sessionNamed(state, 'debug'), 'db') !== null

/** Each walk-through step also needs the ones before it, so the panel ticks them in order. */
function cumulative(checks: readonly ((state: TmuxState) => boolean)[]) {
  return checks.map((_check, index) => (state: TmuxState) => checks.slice(0, index + 1).every(check => check(state)))
}

const [examCreated, examSwitched, examSplit, examEven, examSynced, examDb] = cumulative([
  servicesExists,
  inDebug,
  state => paneCount(services(state)) === 3,
  threePanes,
  servicesSynced,
  hasDb,
])

const level2_8: LevelDefinition = {
  id: '2-8',
  chapter: 2,
  level: 8,
  titleKey: 'levels.2-8.title',
  descriptionKey: 'levels.2-8.description',
  type: 'workspace',
  initialState: singlePaneState(),
  objectives: [
    { id: 'session', descriptionKey: 'game.objectives.2-8-session', validate: inDebug },
    { id: 'panes', descriptionKey: 'game.objectives.2-8-panes', validate: threePanes },
    { id: 'sync', descriptionKey: 'game.objectives.2-8-sync', validate: servicesSynced },
    { id: 'db', descriptionKey: 'game.objectives.2-8-db', validate: hasDb },
  ],
  hints: ['game.hints.2-8-1', 'game.hints.2-8-2', 'game.hints.2-8-3'],
  optimalSteps: 7,
  solution: [
    line('tmux new -d -s debug -n services'),
    line('tmux switch-client -t debug'),
    ...keys('C-b', '%', 'C-b', '%'),
    line(':select-layout even-horizontal'),
    line(':setw synchronize-panes on'),
    line(':new-window -n db'),
  ],
  tutorialSteps: [
    { messageKey: 'game.tutorial.2-8-step1', done: examCreated },
    { messageKey: 'game.tutorial.2-8-step2', done: examSwitched },
    { messageKey: 'game.tutorial.2-8-step3', done: examSplit },
    { messageKey: 'game.tutorial.2-8-step4', done: examEven },
    { messageKey: 'game.tutorial.2-8-step5', done: examSynced },
    { messageKey: 'game.tutorial.2-8-step6', done: examDb },
  ],
}

export const SESSION_LEVELS: readonly LevelDefinition[] = [level2_7, level2_8]
