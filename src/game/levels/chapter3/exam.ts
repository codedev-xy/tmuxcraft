import { getOption } from '@/core/options'
import { locateWindow } from '@/core/selectors'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line, save } from '@/game/sim/inputs'
import { makeSession, makeState, makeWindow, paneNode } from '../helpers'
import { attachedTo, isRow, paneIds, ran } from '../predicates'
import { bindsSideSplit, CONF, scriptCreated, setByFile, sideSplitsByKey, windowOf } from './checks'

// Levels 3-6 and 3-7: moving a window between sessions, and the chapter exam.

/** The window that started as `utils:tools` (ID w3) now belongs to `project`, and `move-window` took it there from `utils`. */
const toolsMoved = (state: TmuxState) =>
  locateWindow(state, 'w3')?.session.name === 'project'
  && ran(state, { name: 'move-window', detail: { window: 'w3', from: 'utils', session: 'project' } })

export const level3_6: LevelDefinition = {
  id: '3-6',
  chapter: 3,
  level: 6,
  titleKey: 'levels.3-6.title',
  descriptionKey: 'levels.3-6.description',
  type: 'fix_layout',
  initialState: (() => {
    const w1 = makeWindow('w1', 'alpha', paneNode('p1', ['Window A']), 'p1')
    const w2 = makeWindow('w2', 'beta', paneNode('p2', ['Window B']), 'p2')
    const w3 = makeWindow('w3', 'tools', paneNode('p3', ['Tools Window']), 'p3')
    return makeState([makeSession('s1', 'project', [w1, w2]), makeSession('s2', 'utils', [w3])], 's1')
  })(),
  objectives: [{ id: 'move', descriptionKey: 'game.objectives.3-6-move', validate: toolsMoved }],
  hints: ['game.hints.3-6-1', 'game.hints.3-6-2', 'game.hints.3-6-3'],
  optimalSteps: 1,
  solution: [line(':move-window -s utils:tools -t project:')],
}

const EXAM_CONF = ['set -g prefix C-a', 'bind | split-window -h', ''].join('\n')

// No tmux server is running at the start, so the one the script starts reads `~/.tmux.conf` by itself.
const EXAM_SCRIPT = ['tmux new-session -d -s work -n main', 'tmux attach -t work', ''].join('\n')

/** Prefix `C-a` and `Prefix |` as a side-by-side split are in effect, both set by lines of `~/.tmux.conf`. */
const examConfLoaded = (state: TmuxState) =>
  getOption(state, 'prefix') === 'C-a' && ran(state, setByFile('prefix', 'C-a', CONF))
  && bindsSideSplit(state, '|')
  && ran(state, { name: 'bind-key', origin: 'config', file: CONF, detail: { key: '|', table: 'prefix' } })

const workStarted = (state: TmuxState) =>
  scriptCreated(state, 'work') && windowOf(state, 'work', 'main') !== null && attachedTo(state, 'work')

/** `main` is two panes side by side, and one of them was made by `|` pressed while the prefix was `C-a`. */
const mainSplitByKey = (state: TmuxState) => {
  const main = windowOf(state, 'work', 'main')
  if (main === null || !isRow(main, 2)) return false
  const panes = paneIds(main)
  return sideSplitsByKey(state, '|', 'C-a').some(entry => panes.includes(entry.detail?.pane ?? ''))
}

export const level3_7: LevelDefinition = {
  id: '3-7',
  chapter: 3,
  level: 7,
  titleKey: 'levels.3-7.title',
  descriptionKey: 'levels.3-7.description',
  type: 'workspace',
  initialState: makeState([], '', true),
  objectives: [
    { id: 'config', descriptionKey: 'game.objectives.3-7-config', validate: examConfLoaded },
    { id: 'session', descriptionKey: 'game.objectives.3-7-session', validate: workStarted },
    { id: 'split', descriptionKey: 'game.objectives.3-7-split', validate: mainSplitByKey },
  ],
  hints: ['game.hints.3-7-1', 'game.hints.3-7-2', 'game.hints.3-7-3'],
  optimalSteps: 6,
  solution: [
    line(`vim ${CONF}`), save(CONF, EXAM_CONF),
    line('vim ~/work.sh'), save('~/work.sh', EXAM_SCRIPT),
    line('bash ~/work.sh'),
    ...keys('C-a', '|'),
  ],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-7-step1', done: state => ran(state, { name: 'save-file', detail: { path: CONF } }) },
    { messageKey: 'game.tutorial.3-7-step2', done: state => ran(state, { name: 'save-file', detail: { path: '~/work.sh' } }) },
    { messageKey: 'game.tutorial.3-7-step3', done: state => workStarted(state) && examConfLoaded(state) },
    { messageKey: 'game.tutorial.3-7-step4', done: mainSplitByKey },
  ],
}
