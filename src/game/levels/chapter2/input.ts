import { findPane, getActivePane } from '@/core/selectors'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line } from '@/game/sim/inputs'
import { makeSession, makeState, makeWindow, paneNode, split } from '../helpers'
import { paneShows, ran, ranInOrder, sessionNamed, windowNamed } from '../predicates'
import { broadcastAfter, lastSyncOn } from './checks'

// Levels 2-5 and 2-6: getting text into panes the tmux way.

const SECRET = 'Alpha-Bravo-Charlie'
const COPIED = { name: 'copy-selection', detail: { text: SECRET } }
const PASTED_RIGHT = { name: 'paste-buffer', detail: { pane: 'p2', text: SECRET } }

const copied = (state: TmuxState): boolean => ran(state, COPIED)

/** The secret itself was pasted into the right pane after the copy (it sits at the prompt, or ran if Enter followed). */
function pastedRight(state: TmuxState): boolean {
  const pane = findPane(state, 'p2')
  const arrived = (pane?.input.includes(SECRET) ?? false) || paneShows(state, 'p2', SECRET)
  return arrived && ranInOrder(state, COPIED, PASTED_RIGHT)
}

const level2_5: LevelDefinition = {
  id: '2-5',
  chapter: 2,
  level: 5,
  titleKey: 'levels.2-5.title',
  descriptionKey: 'levels.2-5.description',
  type: 'text_task',
  initialState: {
    ...makeState([makeSession('s1', '0', [makeWindow('w1', 'bash', split('vertical',
      paneNode('p1', ['$ cat secret.txt', SECRET]),
      paneNode('p2', ['Paste the secret code here:']),
    ), 'p1')])], 's1'),
    files: { '~/secret.txt': `${SECRET}\n` },
  },
  objectives: [
    { id: 'copy', descriptionKey: 'game.objectives.2-5-copy', validate: copied },
    { id: 'paste', descriptionKey: 'game.objectives.2-5-paste', validate: pastedRight },
  ],
  hints: ['game.hints.2-5-1', 'game.hints.2-5-2', 'game.hints.2-5-3'],
  optimalSteps: 4,
  solution: keys('C-b', '[', 'Space', '$', 'Enter', 'C-b', 'Right', 'C-b', ']'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.2-5-step1', done: state => ran(state, { name: 'copy-mode', detail: { pane: 'p1' } }) },
    { messageKey: 'game.tutorial.2-5-step2', done: copied },
    { messageKey: 'game.tutorial.2-5-step3', done: state => copied(state) && getActivePane(state)?.id === 'p2' },
    { messageKey: 'game.tutorial.2-5-step4', done: state => copied(state) && pastedRight(state) },
  ],
}

const SERVERS = ['p1', 'p2', 'p3']
const BROADCAST = 'echo deploy'

const serversWindow = (state: TmuxState) => windowNamed(sessionNamed(state, '0'), 'servers')

const syncOn = (state: TmuxState): boolean => serversWindow(state)?.synchronizePanes === true

/** One `echo deploy` reached all three panes at once after sync was last turned on. */
function deployedEverywhere(state: TmuxState): boolean {
  return broadcastAfter(state, lastSyncOn(state), BROADCAST, SERVERS)
}

const level2_6: LevelDefinition = {
  id: '2-6',
  chapter: 2,
  level: 6,
  titleKey: 'levels.2-6.title',
  descriptionKey: 'levels.2-6.description',
  type: 'workspace',
  initialState: makeState([makeSession('s1', '0', [makeWindow('w1', 'servers', split('vertical',
    paneNode('p1', ['Server 1']),
    split('horizontal', paneNode('p2', ['Server 2']), paneNode('p3', ['Server 3'])),
  ), 'p1')])], 's1'),
  objectives: [
    { id: 'sync', descriptionKey: 'game.objectives.2-6-sync', validate: syncOn },
    { id: 'broadcast', descriptionKey: 'game.objectives.2-6-broadcast', validate: deployedEverywhere },
  ],
  hints: ['game.hints.2-6-1', 'game.hints.2-6-2', 'game.hints.2-6-3'],
  optimalSteps: 2,
  solution: [line(':setw synchronize-panes on'), line(BROADCAST)],
  tutorialSteps: [
    { messageKey: 'game.tutorial.2-6-step1', done: syncOn },
    { messageKey: 'game.tutorial.2-6-step2', done: state => syncOn(state) && deployedEverywhere(state) },
  ],
}

export const INPUT_LEVELS: readonly LevelDefinition[] = [level2_5, level2_6]
