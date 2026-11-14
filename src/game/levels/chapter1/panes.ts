import { findPane, getActiveWindow, windowPanes } from '@/core/selectors'
import type { TmuxState, Window } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line } from '@/game/sim/inputs'
import { hasPanes, isGrid, ran } from '../predicates'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState, split } from '../helpers'
import { activePaneIs, focusedAmong, hasSplit } from './checks'

// Chapter 1, levels 1-6: sessions and panes.

const oneWindow = (window: Window): TmuxState => makeState([makeSession('s1', '0', [window])], 's1')

const SIDE_BY_SIDE = { name: 'split-window', detail: { direction: 'h' } }
const STACKED = { name: 'split-window', detail: { direction: 'v' } }

const level1_1: LevelDefinition = {
  id: '1-1',
  chapter: 1,
  level: 1,
  titleKey: 'levels.1-1.title',
  descriptionKey: 'levels.1-1.description',
  type: 'tutorial',
  initialState: makeState([], '', true),
  objectives: [
    {
      id: 'create-session',
      descriptionKey: 'levels.1-1.description',
      validate: state => state.sessions.length >= 1 && !state.isDetached,
    },
  ],
  hints: ['game.hints.1-1-1', 'game.hints.1-1-2', 'game.hints.1-1-3'],
  optimalSteps: 1,
  solution: [line('tmux new -s mysession')],
}

function threePanesBothWays(state: TmuxState): boolean {
  const window = getActiveWindow(state)
  if (!window) return false
  const tree = window.layoutTree
  return windowPanes(window).length >= 3 && hasSplit(tree, 'vertical') && hasSplit(tree, 'horizontal')
}

const level1_2: LevelDefinition = {
  id: '1-2',
  chapter: 1,
  level: 2,
  titleKey: 'levels.1-2.title',
  descriptionKey: 'levels.1-2.description',
  type: 'layout_puzzle',
  initialState: singlePaneState(),
  objectives: [
    { id: 'side-by-side', descriptionKey: 'game.objectives.1-2-side-by-side', validate: state => ran(state, SIDE_BY_SIDE) },
    { id: 'stacked', descriptionKey: 'game.objectives.1-2-stacked', validate: state => ran(state, STACKED) },
    { id: 'three-panes', descriptionKey: 'game.objectives.1-2-three-panes', validate: threePanesBothWays },
  ],
  hints: ['game.hints.1-2-1', 'game.hints.1-2-2', 'game.hints.1-2-3'],
  optimalSteps: 2,
  solution: keys('C-b', '%', 'C-b', '"'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-2-step1', done: state => ran(state, SIDE_BY_SIDE) },
    { messageKey: 'game.tutorial.1-2-step2', done: state => ran(state, STACKED) },
  ],
}

const GRID_PANES = ['p1', 'p2', 'p3', 'p4']

const level1_3: LevelDefinition = {
  id: '1-3',
  chapter: 1,
  level: 3,
  titleKey: 'levels.1-3.title',
  descriptionKey: 'levels.1-3.description',
  type: 'navigation',
  initialState: oneWindow(makeWindow('w1', 'bash', split('horizontal',
    split('vertical', paneNode('p1'), paneNode('p2')),
    split('vertical', paneNode('p3'), paneNode('p4', ['>>> TARGET <<<'])),
  ), 'p1')),
  objectives: [
    {
      id: 'navigate-to-target',
      descriptionKey: 'levels.1-3.description',
      validate: state => focusedAmong(state, 'p4', GRID_PANES),
    },
  ],
  hints: ['game.hints.1-3-1', 'game.hints.1-3-2', 'game.hints.1-3-3'],
  optimalSteps: 2,
  solution: keys('C-b', 'Right', 'C-b', 'Down'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-3-step1', done: state => activePaneIs(state, 'p2') || activePaneIs(state, 'p4') },
    { messageKey: 'game.tutorial.1-3-step2', done: state => activePaneIs(state, 'p4') },
  ],
}

const p2Closed = (state: TmuxState): boolean => findPane(state, 'p2') === null

const level1_4: LevelDefinition = {
  id: '1-4',
  chapter: 1,
  level: 4,
  titleKey: 'levels.1-4.title',
  descriptionKey: 'levels.1-4.description',
  type: 'layout_puzzle',
  initialState: oneWindow(makeWindow('w1', 'bash', split('vertical',
    paneNode('p1'),
    split('horizontal', paneNode('p2', ['CLOSE ME']), paneNode('p3')),
  ), 'p1')),
  objectives: [
    {
      id: 'close-target-pane',
      descriptionKey: 'levels.1-4.description',
      // p2 must be gone, not just moved to another window with break-pane.
      validate: state => hasPanes(getActiveWindow(state), ['p1', 'p3']) && p2Closed(state),
    },
  ],
  hints: ['game.hints.1-4-1', 'game.hints.1-4-2', 'game.hints.1-4-3'],
  optimalSteps: 2,
  solution: keys('C-b', 'Right', 'C-b', 'x'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-4-step1', done: state => activePaneIs(state, 'p2') || p2Closed(state) },
    { messageKey: 'game.tutorial.1-4-step2', done: p2Closed },
  ],
}

function isFourGrid(state: TmuxState): boolean {
  const window = getActiveWindow(state)
  return !!window && isGrid(window, 2, 2)
}

const level1_5: LevelDefinition = {
  id: '1-5',
  chapter: 1,
  level: 5,
  titleKey: 'levels.1-5.title',
  descriptionKey: 'levels.1-5.description',
  type: 'layout_puzzle',
  initialState: singlePaneState(),
  objectives: [
    { id: 'four-grid', descriptionKey: 'levels.1-5.description', validate: isFourGrid },
  ],
  hints: ['game.hints.1-5-1', 'game.hints.1-5-2', 'game.hints.1-5-3'],
  optimalSteps: 4,
  solution: keys('C-b', '%', 'C-b', '"', 'C-b', 'Left', 'C-b', '"'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-5-step1', done: state => ran(state, SIDE_BY_SIDE) },
    { messageKey: 'game.tutorial.1-5-step2', done: state => ran(state, STACKED) },
    { messageKey: 'game.tutorial.1-5-step3', done: isFourGrid },
  ],
}

const secretZoomed = (state: TmuxState): boolean =>
  focusedAmong(state, 'p2', ['p1', 'p2', 'p3']) && getActiveWindow(state)?.zoomed === true

const level1_6: LevelDefinition = {
  id: '1-6',
  chapter: 1,
  level: 6,
  titleKey: 'levels.1-6.title',
  descriptionKey: 'levels.1-6.description',
  type: 'navigation',
  initialState: oneWindow(makeWindow('w1', 'bash', split('horizontal',
    split('vertical', paneNode('p1'), paneNode('p2', ['SECRET DATA'])),
    paneNode('p3'),
  ), 'p1')),
  objectives: [
    { id: 'zoom-pane', descriptionKey: 'levels.1-6.description', validate: secretZoomed },
  ],
  hints: ['game.hints.1-6-1', 'game.hints.1-6-2', 'game.hints.1-6-3'],
  optimalSteps: 2,
  solution: keys('C-b', 'Right', 'C-b', 'z'),
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-6-step1', done: state => activePaneIs(state, 'p2') },
    { messageKey: 'game.tutorial.1-6-step2', done: secretZoomed },
  ],
}

export const paneLevels: LevelDefinition[] = [level1_1, level1_2, level1_3, level1_4, level1_5, level1_6]
