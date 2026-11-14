import { getOption, isOn } from '@/core/options'
import { getActivePane } from '@/core/selectors'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { click, keys, line } from '@/game/sim/inputs'
import { makeSession, makeState, makeWindow, paneNode, singlePaneState, split } from '../helpers'
import { ran } from '../predicates'
import { bindsSideSplit, sideSplitsByKey } from './checks'

// Levels 3-1 to 3-3: options and key bindings set by hand.

const prefixIsCtrlA = (state: TmuxState) => getOption(state, 'prefix') === 'C-a'

const barBindsSplit = (state: TmuxState) => bindsSideSplit(state, '|')

/** A side-by-side split came from `|` pressed while the prefix was `C-a`. */
const splitByCustomKey = (state: TmuxState) => sideSplitsByKey(state, '|', 'C-a').length > 0

export const level3_1: LevelDefinition = {
  id: '3-1',
  chapter: 3,
  level: 1,
  titleKey: 'levels.3-1.title',
  descriptionKey: 'levels.3-1.description',
  type: 'tutorial',
  initialState: singlePaneState(),
  objectives: [
    { id: 'prefix', descriptionKey: 'game.objectives.3-1-prefix', validate: prefixIsCtrlA },
    { id: 'bind', descriptionKey: 'game.objectives.3-1-bind', validate: barBindsSplit },
    { id: 'split', descriptionKey: 'game.objectives.3-1-split', validate: splitByCustomKey },
  ],
  hints: ['game.hints.3-1-1', 'game.hints.3-1-2', 'game.hints.3-1-3'],
  optimalSteps: 3,
  solution: [line(':set -g prefix C-a'), line(':bind-key | split-window -h'), ...keys('C-a', '|')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-1-step1', done: prefixIsCtrlA },
    { messageKey: 'game.tutorial.3-1-step2', done: barBindsSplit },
    { messageKey: 'game.tutorial.3-1-step3', done: splitByCustomKey },
  ],
}

const mouseOn = (state: TmuxState) => isOn(state, 'mouse')

const clickedP2 = (state: TmuxState) =>
  ran(state, { name: 'select-pane', origin: 'mouse', detail: { pane: 'p2' } }) && getActivePane(state)?.id === 'p2'

export const level3_2: LevelDefinition = {
  id: '3-2',
  chapter: 3,
  level: 2,
  titleKey: 'levels.3-2.title',
  descriptionKey: 'levels.3-2.description',
  type: 'tutorial',
  initialState: (() => {
    const tree = split('vertical', paneNode('p1', ['Click me!']), paneNode('p2', ['No, click me!']))
    return makeState([makeSession('s1', '0', [makeWindow('w1', 'bash', tree, 'p1')])], 's1')
  })(),
  objectives: [
    { id: 'mouse', descriptionKey: 'game.objectives.3-2-mouse', validate: mouseOn },
    { id: 'click', descriptionKey: 'game.objectives.3-2-click', validate: clickedP2 },
  ],
  hints: ['game.hints.3-2-1', 'game.hints.3-2-2', 'game.hints.3-2-3'],
  optimalSteps: 2,
  solution: [line(':set -g mouse on'), click('p2')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-2-step1', done: mouseOn },
    { messageKey: 'game.tutorial.3-2-step2', done: clickedP2 },
  ],
}

/** `bg=blue` is one of the parts of `status-style`, which commas or spaces separate. */
const blueBar = (state: TmuxState) => getOption(state, 'status-style').split(/[,\s]+/).includes('bg=blue')

const clockOnRight = (state: TmuxState) => getOption(state, 'status-right').includes('%H:%M')

export const level3_3: LevelDefinition = {
  id: '3-3',
  chapter: 3,
  level: 3,
  titleKey: 'levels.3-3.title',
  descriptionKey: 'levels.3-3.description',
  type: 'workspace',
  initialState: singlePaneState(),
  objectives: [
    { id: 'style', descriptionKey: 'game.objectives.3-3-style', validate: blueBar },
    { id: 'clock', descriptionKey: 'game.objectives.3-3-clock', validate: clockOnRight },
  ],
  hints: ['game.hints.3-3-1', 'game.hints.3-3-2', 'game.hints.3-3-3'],
  optimalSteps: 2,
  solution: [line(':set -g status-style bg=blue'), line(':set -g status-right "%H:%M"')],
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-3-step1', done: blueBar },
    { messageKey: 'game.tutorial.3-3-step2', done: clockOnRight },
  ],
}
