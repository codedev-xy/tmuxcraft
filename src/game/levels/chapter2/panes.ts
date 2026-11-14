import { getActiveWindow } from '@/core/selectors'
import type { LayoutNode, TmuxState, Window } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { keys, line } from '@/game/sim/inputs'
import { makeSession, makeState, makeWindow, paneNode, split } from '../helpers'
import { hasPanes, isEvenRow, isRow, paneIds, ran } from '../predicates'
import { leftPaneShare } from './checks'

// Levels 2-1 to 2-4: changing panes that already exist.

const oneWindow = (name: string, tree: LayoutNode, activePaneId: string): TmuxState =>
  makeState([makeSession('s1', '0', [makeWindow('w1', name, tree, activePaneId)])], 's1')

/** About 70%: the left pane may take 67% to 73% of the width, so three `Ctrl+b Alt+Right` presses (65%) are not enough. */
const RESIZE_BAND = { min: 67, max: 73 }

/** Where one `Ctrl+b Alt+Right` leaves the border: the simulator resizes by 1% of the split per cell. */
const ONE_PRESS_PERCENT = 55

const leftPanePercent = (window: Window): number => Math.round(leftPaneShare(window) * 100)

function leftPaneResized(state: TmuxState): boolean {
  const window = getActiveWindow(state)
  if (!window || !hasPanes(window, ['p1', 'p2']) || !isRow(window, 2)) return false
  const percent = leftPanePercent(window)
  return percent >= RESIZE_BAND.min && percent <= RESIZE_BAND.max
}

const level2_1: LevelDefinition = {
  id: '2-1',
  chapter: 2,
  level: 1,
  titleKey: 'levels.2-1.title',
  descriptionKey: 'levels.2-1.description',
  type: 'layout_puzzle',
  initialState: oneWindow('bash', split('vertical', paneNode('p1'), paneNode('p2')), 'p1'),
  objectives: [{ id: 'resize', descriptionKey: 'game.objectives.2-1-resize', validate: leftPaneResized }],
  hints: ['game.hints.2-1-1', 'game.hints.2-1-2', 'game.hints.2-1-3'],
  optimalSteps: 4,
  solution: [...keys('C-b', 'M-Right'), ...keys('C-b', 'M-Right'), ...keys('C-b', 'M-Right'), ...keys('C-b', 'M-Right')],
  tutorialSteps: [
    {
      messageKey: 'game.tutorial.2-1-step1',
      done: state => {
        const window = getActiveWindow(state)
        return window !== null && leftPanePercent(window) >= ONE_PRESS_PERCENT
      },
    },
    { messageKey: 'game.tutorial.2-1-step2', done: leftPaneResized },
  ],
}

const level2_2: LevelDefinition = {
  id: '2-2',
  chapter: 2,
  level: 2,
  titleKey: 'levels.2-2.title',
  descriptionKey: 'levels.2-2.description',
  type: 'layout_puzzle',
  initialState: oneWindow('bash', split('vertical', paneNode('p1'), split('horizontal', paneNode('p2'), paneNode('p3'))), 'p1'),
  objectives: [
    {
      id: 'even-row',
      descriptionKey: 'game.objectives.2-2-even',
      validate: state => {
        const window = getActiveWindow(state)
        return window !== null && hasPanes(window, ['p1', 'p2', 'p3']) && isEvenRow(window, 3)
      },
    },
  ],
  hints: ['game.hints.2-2-1', 'game.hints.2-2-2', 'game.hints.2-2-3'],
  optimalSteps: 1,
  solution: [line(':select-layout even-horizontal')],
}

const level2_3: LevelDefinition = {
  id: '2-3',
  chapter: 2,
  level: 3,
  titleKey: 'levels.2-3.title',
  descriptionKey: 'levels.2-3.description',
  type: 'fix_layout',
  initialState: oneWindow('bash', split('vertical',
    paneNode('p1', ['Panel B - Should be on RIGHT']),
    paneNode('p2', ['Panel A - Should be on LEFT']),
  ), 'p1'),
  objectives: [
    {
      id: 'swapped',
      descriptionKey: 'game.objectives.2-3-swap',
      validate: state => {
        const window = getActiveWindow(state)
        return window !== null && isRow(window, 2) && paneIds(window).join() === 'p2,p1'
      },
    },
  ],
  hints: ['game.hints.2-3-1', 'game.hints.2-3-2', 'game.hints.2-3-3'],
  optimalSteps: 1,
  solution: keys('C-b', '}'),
}

// 2-4: the log pane (p2) leaves 'main' for a window of its own; the notes pane (p3) leaves 'temp' for 'main'.

const allWindows = (state: TmuxState) => state.sessions.flatMap(session => session.windows)

function logPaneBrokenOut(state: TmuxState): boolean {
  const alone = allWindows(state).some(window => paneIds(window).join() === 'p2')
  return alone && ran(state, { name: 'break-pane', detail: { pane: 'p2' } })
}

function notesPaneJoined(state: TmuxState): boolean {
  const main = allWindows(state).find(window => window.name === 'main')
  if (!main || allWindows(state).some(window => window.name === 'temp')) return false
  return hasPanes(main, ['p1', 'p3']) && isRow(main, 2) && ran(state, { name: 'join-pane', detail: { source: 'p3' } })
}

const level2_4: LevelDefinition = {
  id: '2-4',
  chapter: 2,
  level: 4,
  titleKey: 'levels.2-4.title',
  descriptionKey: 'levels.2-4.description',
  type: 'fix_layout',
  initialState: makeState([makeSession('s1', '0', [
    makeWindow('w1', 'main', split('vertical', paneNode('p1', ['editor']), paneNode('p2', ['server log'])), 'p2'),
    makeWindow('w2', 'temp', paneNode('p3', ['notes']), 'p3'),
  ], 0)], 's1'),
  objectives: [
    { id: 'break', descriptionKey: 'game.objectives.2-4-break', validate: logPaneBrokenOut },
    { id: 'join', descriptionKey: 'game.objectives.2-4-join', validate: notesPaneJoined },
  ],
  hints: ['game.hints.2-4-1', 'game.hints.2-4-2', 'game.hints.2-4-3'],
  optimalSteps: 2,
  solution: [...keys('C-b', '!'), line(':join-pane -h -s temp -t main')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.2-4-step1', done: logPaneBrokenOut },
    { messageKey: 'game.tutorial.2-4-step2', done: state => logPaneBrokenOut(state) && notesPaneJoined(state) },
  ],
}

export const PANE_LEVELS: readonly LevelDefinition[] = [level2_1, level2_2, level2_3, level2_4]
