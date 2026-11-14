import { getOption, isOn } from '@/core/options'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line, save } from '@/game/sim/inputs'
import { makeState, singlePaneState } from '../helpers'
import { attachedTo, isRow, ran } from '../predicates'
import { bindsSource, CONF, ranOnWindow, scriptCreated, setByFile, windowOf } from './checks'

// Levels 3-4 and 3-5: a config file and a start script written in the editor.

const CONF_TEXT = ['set -g prefix C-a', 'set -g mouse on', `bind r source-file ${CONF}`, ''].join('\n')

const savedConf = (state: TmuxState) => ran(state, { name: 'save-file', detail: { path: CONF } })

/** The three settings are in effect, and each was set by a line of `~/.tmux.conf` when it was sourced. */
const confLoaded = (state: TmuxState) =>
  ran(state, { name: 'source-file', detail: { path: CONF } })
  && getOption(state, 'prefix') === 'C-a' && ran(state, setByFile('prefix', 'C-a', CONF))
  && isOn(state, 'mouse') && ran(state, setByFile('mouse', 'on', CONF))
  && bindsSource(state, 'r', CONF)
  && ran(state, { name: 'bind-key', origin: 'config', file: CONF, detail: { key: 'r', table: 'prefix' } })

const reloadedByKey = (state: TmuxState) =>
  ran(state, { name: 'source-file', origin: 'key', key: 'r', detail: { path: CONF } })

export const level3_4: LevelDefinition = {
  id: '3-4',
  chapter: 3,
  level: 4,
  titleKey: 'levels.3-4.title',
  descriptionKey: 'levels.3-4.description',
  type: 'workspace',
  initialState: singlePaneState(),
  objectives: [
    { id: 'saved', descriptionKey: 'game.objectives.3-4-saved', validate: savedConf },
    { id: 'loaded', descriptionKey: 'game.objectives.3-4-loaded', validate: confLoaded },
    { id: 'reloaded', descriptionKey: 'game.objectives.3-4-reloaded', validate: reloadedByKey },
  ],
  hints: ['game.hints.3-4-1', 'game.hints.3-4-2', 'game.hints.3-4-3'],
  optimalSteps: 4,
  solution: [line(`vim ${CONF}`), save(CONF, CONF_TEXT), line(`:source-file ${CONF}`), ...keys('C-a', 'r')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-4-step1', done: savedConf },
    { messageKey: 'game.tutorial.3-4-step2', done: confLoaded },
    { messageKey: 'game.tutorial.3-4-step3', done: reloadedByKey },
  ],
}

const DEV_SCRIPT = [
  'tmux new-session -d -s dev -n editor',
  'tmux split-window -h -t dev:editor',
  'tmux new-window -t dev -n server',
  "tmux send-keys -t dev:server 'npm run dev' Enter",
  'tmux attach -t dev',
  '',
].join('\n')

const devBuilt = (state: TmuxState) => scriptCreated(state, 'dev')

const editorBuilt = (state: TmuxState) => {
  const editor = windowOf(state, 'dev', 'editor')
  return editor !== null && isRow(editor, 2)
    && ranOnWindow(state, { name: 'split-window', origin: 'script', detail: { direction: 'h' } }, editor)
}

/** `npm run dev` ran in the server window because the script typed it there with `send-keys`. */
const serverBuilt = (state: TmuxState) => {
  const server = windowOf(state, 'dev', 'server')
  return ran(state, { name: 'new-window', origin: 'script', detail: { name: 'server', session: 'dev' } })
    && ranOnWindow(state, { name: 'send-keys', origin: 'script' }, server)
    && ranOnWindow(state, { name: 'shell', origin: 'script', line: 'npm run dev' }, server)
}

const attachedToDev = (state: TmuxState) => attachedTo(state, 'dev')

export const level3_5: LevelDefinition = {
  id: '3-5',
  chapter: 3,
  level: 5,
  titleKey: 'levels.3-5.title',
  descriptionKey: 'levels.3-5.description',
  type: 'workspace',
  initialState: makeState([], '', true),
  objectives: [
    { id: 'session', descriptionKey: 'game.objectives.3-5-session', validate: devBuilt },
    { id: 'editor', descriptionKey: 'game.objectives.3-5-editor', validate: editorBuilt },
    { id: 'server', descriptionKey: 'game.objectives.3-5-server', validate: serverBuilt },
    { id: 'attached', descriptionKey: 'game.objectives.3-5-attached', validate: attachedToDev },
  ],
  hints: ['game.hints.3-5-1', 'game.hints.3-5-2', 'game.hints.3-5-3'],
  optimalSteps: 3,
  solution: [line('vim ~/dev.sh'), save('~/dev.sh', DEV_SCRIPT), line('bash ~/dev.sh')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-5-step1', done: state => ran(state, 'save-file') },
    { messageKey: 'game.tutorial.3-5-step2', done: devBuilt },
  ],
}
