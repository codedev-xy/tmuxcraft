import { getActiveSession, getActiveWindow } from '@/core/selectors'
import type { TmuxState, Window } from '@/core/types'
import type { LevelDefinition, LevelObjective } from '@/game/level-types'
import { keys, line, prompt } from '@/game/sim/inputs'
import { isColumn, isRow, ran, ranInOrder } from '../predicates'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState } from '../helpers'
import { sessionWindows, windowIs } from './checks'

// Chapter 1, levels 7-11: windows, detaching, and the chapter exam.

const windowCount = (state: TmuxState): number => sessionWindows(state).length

const level1_7: LevelDefinition = {
  id: '1-7',
  chapter: 1,
  level: 7,
  titleKey: 'levels.1-7.title',
  descriptionKey: 'levels.1-7.description',
  type: 'workspace',
  initialState: singlePaneState(),
  objectives: [
    { id: 'three-windows', descriptionKey: 'levels.1-7.description', validate: state => windowCount(state) === 3 },
  ],
  hints: ['game.hints.1-7-1', 'game.hints.1-7-2', 'game.hints.1-7-3'],
  optimalSteps: 2,
  solution: keys('C-b', 'c', 'C-b', 'c'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-7-step1', done: state => windowCount(state) >= 2 },
    { messageKey: 'game.tutorial.1-7-step2', done: state => windowCount(state) >= 3 },
  ],
}

const GREEK = ['alpha', 'beta', 'gamma']

/** True when the session still has the windows w1, w2, w3 named alpha, beta, gamma, in that order. */
const greekWindowsKept = (state: TmuxState): boolean =>
  windowCount(state) === 3 && GREEK.every((name, index) => windowIs(state, index, `w${index + 1}`, name))

const level1_8: LevelDefinition = {
  id: '1-8',
  chapter: 1,
  level: 8,
  titleKey: 'levels.1-8.title',
  descriptionKey: 'levels.1-8.description',
  type: 'navigation',
  initialState: makeState([makeSession('s1', '0', [
    makeWindow('w1', 'alpha', paneNode('p1', ['Window Alpha']), 'p1'),
    makeWindow('w2', 'beta', paneNode('p2', ['Window Beta']), 'p2'),
    makeWindow('w3', 'gamma', paneNode('p3', ['>>> GO HERE <<<']), 'p3'),
  ], 0)], 's1'),
  objectives: [
    {
      id: 'switch-to-gamma',
      descriptionKey: 'levels.1-8.description',
      validate: state => greekWindowsKept(state) && getActiveWindow(state)?.id === 'w3',
    },
  ],
  hints: ['game.hints.1-8-1', 'game.hints.1-8-2', 'game.hints.1-8-3'],
  optimalSteps: 1,
  solution: keys('C-b', '2'),
}

const NEW_NAMES = ['editor', 'server', 'logs']

/** The starting window at `index` (w1, w2, w3) is still there and carries its new name. */
const renamed = (index: number) => (state: TmuxState): boolean =>
  windowIs(state, index, `w${index + 1}`, NEW_NAMES[index])

const renameObjectives: LevelObjective[] = [
  { id: 'name-editor', descriptionKey: 'game.objectives.1-9-editor', validate: renamed(0) },
  { id: 'name-server', descriptionKey: 'game.objectives.1-9-server', validate: renamed(1) },
  {
    id: 'name-logs',
    descriptionKey: 'game.objectives.1-9-logs',
    validate: state => renamed(2)(state) && windowCount(state) === 3,
  },
]

const level1_9: LevelDefinition = {
  id: '1-9',
  chapter: 1,
  level: 9,
  titleKey: 'levels.1-9.title',
  descriptionKey: 'levels.1-9.description',
  type: 'workspace',
  initialState: makeState([makeSession('s1', '0', [
    makeWindow('w1', 'bash', paneNode('p1'), 'p1'),
    makeWindow('w2', 'bash', paneNode('p2'), 'p2'),
    makeWindow('w3', 'bash', paneNode('p3'), 'p3'),
  ], 0)], 's1'),
  objectives: renameObjectives,
  hints: ['game.hints.1-9-1', 'game.hints.1-9-2', 'game.hints.1-9-3'],
  optimalSteps: 5,
  solution: [
    ...keys('C-b', ','), prompt('editor'),
    ...keys('C-b', 'n', 'C-b', ','), prompt('server'),
    ...keys('C-b', 'n', 'C-b', ','), prompt('logs'),
  ],
  tutorialSteps: NEW_NAMES.map((_name, index) => ({
    messageKey: `game.tutorial.1-9-step${index + 1}`,
    done: renamed(index),
  })),
}

const detached = (state: TmuxState): boolean => ran(state, 'detach-client')

/** Attached to 'mywork' now, by an attach that came after a detach. */
const reattached = (state: TmuxState): boolean =>
  ranInOrder(state, 'detach-client', { name: 'attach-session', detail: { session: 'mywork' } })
  && !state.isDetached && getActiveSession(state)?.name === 'mywork'

const level1_10: LevelDefinition = {
  id: '1-10',
  chapter: 1,
  level: 10,
  titleKey: 'levels.1-10.title',
  descriptionKey: 'levels.1-10.description',
  type: 'tutorial',
  initialState: singlePaneState('mywork'),
  objectives: [
    { id: 'detach', descriptionKey: 'game.objectives.1-10-detach', validate: detached },
    { id: 'reattach', descriptionKey: 'game.objectives.1-10-reattach', validate: reattached },
  ],
  hints: ['game.hints.1-10-1', 'game.hints.1-10-2', 'game.hints.1-10-3'],
  optimalSteps: 2,
  solution: [...keys('C-b', 'd'), line('tmux attach -t mywork')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-10-step1', done: detached },
    { messageKey: 'game.tutorial.1-10-step2', done: reattached },
  ],
}

/** The current session's window at `index` is named `name` and has the shape `shape` asks for. */
const windowAt = (index: number, name: string, shape: (window: Window) => boolean) => (state: TmuxState): boolean => {
  const window = sessionWindows(state)[index]
  return window?.name === name && shape(window)
}

const editorDone = windowAt(0, 'editor', window => isRow(window, 2))
const serverDone = windowAt(1, 'server', window => isRow(window, 1))
const logsShaped = windowAt(2, 'logs', window => isColumn(window, 2))

const level1_11: LevelDefinition = {
  id: '1-11',
  chapter: 1,
  level: 11,
  titleKey: 'levels.1-11.title',
  descriptionKey: 'levels.1-11.description',
  type: 'workspace',
  initialState: singlePaneState(),
  objectives: [
    { id: 'editor-window', descriptionKey: 'game.objectives.1-11-editor', validate: editorDone },
    { id: 'server-window', descriptionKey: 'game.objectives.1-11-server', validate: serverDone },
    {
      id: 'logs-window',
      descriptionKey: 'game.objectives.1-11-logs',
      validate: state => logsShaped(state) && windowCount(state) === 3,
    },
  ],
  hints: ['game.hints.1-11-1', 'game.hints.1-11-2', 'game.hints.1-11-3'],
  optimalSteps: 5,
  solution: [
    ...keys('C-b', ','), prompt('editor'), ...keys('C-b', '%'),
    line(':new-window -n server'), line(':new-window -n logs'), ...keys('C-b', '"'),
  ],
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-11-step1', done: windowAt(0, 'editor', () => true) },
    { messageKey: 'game.tutorial.1-11-step2', done: editorDone },
    { messageKey: 'game.tutorial.1-11-step3', done: windowAt(1, 'server', () => true) },
    { messageKey: 'game.tutorial.1-11-step4', done: windowAt(2, 'logs', () => true) },
    { messageKey: 'game.tutorial.1-11-step5', done: logsShaped },
  ],
}

export const windowLevels: LevelDefinition[] = [level1_7, level1_8, level1_9, level1_10, level1_11]
