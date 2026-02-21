import type { LevelDefinition } from '@/game/level-types'
import type { TmuxState, LayoutNode } from '@/core/types'
import { singlePaneState, paneNode, split, makeWindow, makeSession, makeState } from '../helpers'
import { getAllPanes } from '@/core/layout-engine'

function countPanesInTree(node: LayoutNode): number {
  if (node.type === 'pane') return 1
  if (node.children) return countPanesInTree(node.children[0]) + countPanesInTree(node.children[1])
  return 0
}

function hasBothSplitDirections(node: LayoutNode): boolean {
  let hasHorizontal = false
  let hasVertical = false
  function walk(n: LayoutNode) {
    if (n.type === 'split') {
      if (n.direction === 'horizontal') hasHorizontal = true
      if (n.direction === 'vertical') hasVertical = true
      if (n.children) {
        walk(n.children[0])
        walk(n.children[1])
      }
    }
  }
  walk(node)
  return hasHorizontal && hasVertical
}

function getActiveSession(state: TmuxState) {
  return state.sessions.find(s => s.id === state.activeSessionId)
}

function getActiveWindow(state: TmuxState) {
  const sess = getActiveSession(state)
  return sess?.windows[sess.activeWindowIndex]
}

// Level 1-1: Meet tmux
const level1_1: LevelDefinition = {
  id: '1-1',
  chapter: 1,
  level: 1,
  titleKey: 'levels.1-1.title',
  descriptionKey: 'levels.1-1.description',
  type: 'tutorial',
  initialState: makeState([], '', true),
  availableCommands: ['new-session'],
  objectives: [
    {
      id: 'create-session',
      descriptionKey: 'levels.1-1.description',
      validate: (state) => state.sessions.length >= 1 && !state.isDetached,
    },
  ],
  hints: ['game.hints.1-1-1', 'game.hints.1-1-2', 'game.hints.1-1-3'],
  optimalSteps: 1,
}

// Level 1-2: Split Operations (merged from old 1-2 Horizontal + 1-3 Vertical)
const level1_2: LevelDefinition = {
  id: '1-2',
  chapter: 1,
  level: 2,
  titleKey: 'levels.1-2.title',
  descriptionKey: 'levels.1-2.description',
  type: 'layout_puzzle',
  initialState: singlePaneState(),
  availableCommands: ['split-horizontal', 'split-vertical'],
  objectives: [
    {
      id: 'both-splits',
      descriptionKey: 'levels.1-2.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        return !!win && countPanesInTree(win.layoutTree) >= 3 && hasBothSplitDirections(win.layoutTree)
      },
    },
  ],
  hints: ['game.hints.1-2-1', 'game.hints.1-2-2', 'game.hints.1-2-3'],
  optimalSteps: 2,
}

// Level 1-3: Pane Navigation (was 1-4)
const level1_3: LevelDefinition = {
  id: '1-3',
  chapter: 1,
  level: 3,
  titleKey: 'levels.1-3.title',
  descriptionKey: 'levels.1-3.description',
  type: 'navigation',
  initialState: (() => {
    const tree = split('horizontal',
      split('vertical', paneNode('p1'), paneNode('p2')),
      split('vertical', paneNode('p3'), paneNode('p4', ['>>> TARGET <<<']))
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['select-pane'],
  objectives: [
    {
      id: 'navigate-to-target',
      descriptionKey: 'levels.1-3.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        return win?.activePaneId === 'p4'
      },
    },
  ],
  hints: ['game.hints.1-3-1', 'game.hints.1-3-2', 'game.hints.1-3-3'],
  optimalSteps: 2,
}

// Level 1-4: Close Pane (was 1-5)
const level1_4: LevelDefinition = {
  id: '1-4',
  chapter: 1,
  level: 4,
  titleKey: 'levels.1-4.title',
  descriptionKey: 'levels.1-4.description',
  type: 'layout_puzzle',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1'),
      split('horizontal', paneNode('p2', ['CLOSE ME']), paneNode('p3'))
    )
    const win = makeWindow('w1', 'bash', tree, 'p2')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['close-pane', 'exit', 'select-pane'],
  objectives: [
    {
      id: 'close-target-pane',
      descriptionKey: 'levels.1-4.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        return !!win && countPanesInTree(win.layoutTree) === 2
      },
    },
  ],
  hints: ['game.hints.1-4-1', 'game.hints.1-4-2', 'game.hints.1-4-3'],
  optimalSteps: 1,
}

// Level 1-5: Four Grid Layout (was 1-6)
const level1_5: LevelDefinition = {
  id: '1-5',
  chapter: 1,
  level: 5,
  titleKey: 'levels.1-5.title',
  descriptionKey: 'levels.1-5.description',
  type: 'layout_puzzle',
  initialState: singlePaneState(),
  availableCommands: ['split-horizontal', 'split-vertical', 'select-pane'],
  objectives: [
    {
      id: 'four-grid',
      descriptionKey: 'levels.1-5.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        return !!win && countPanesInTree(win.layoutTree) === 4
      },
    },
  ],
  hints: ['game.hints.1-5-1', 'game.hints.1-5-2', 'game.hints.1-5-3'],
  optimalSteps: 4,
}

// Level 1-6: Pane Zoom (was 1-7)
const level1_6: LevelDefinition = {
  id: '1-6',
  chapter: 1,
  level: 6,
  titleKey: 'levels.1-6.title',
  descriptionKey: 'levels.1-6.description',
  type: 'navigation',
  initialState: (() => {
    const tree = split('horizontal',
      split('vertical', paneNode('p1'), paneNode('p2', ['SECRET DATA'])),
      paneNode('p3')
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['zoom-pane', 'select-pane'],
  objectives: [
    {
      id: 'zoom-pane',
      descriptionKey: 'levels.1-6.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        if (!win) return false
        const allPanes = getAllPanes(win.layoutTree)
        const p2 = allPanes.find(p => p.id === 'p2')
        return !!p2 && p2.isZoomed && win.activePaneId === 'p2'
      },
    },
  ],
  hints: ['game.hints.1-6-1', 'game.hints.1-6-2', 'game.hints.1-6-3'],
  optimalSteps: 2,
}

// Level 1-7: New Window (was 1-8)
const level1_7: LevelDefinition = {
  id: '1-7',
  chapter: 1,
  level: 7,
  titleKey: 'levels.1-7.title',
  descriptionKey: 'levels.1-7.description',
  type: 'workspace',
  initialState: singlePaneState(),
  availableCommands: ['new-window'],
  objectives: [
    {
      id: 'three-windows',
      descriptionKey: 'levels.1-7.description',
      validate: (state) => {
        const sess = getActiveSession(state)
        return !!sess && sess.windows.length >= 3
      },
    },
  ],
  hints: ['game.hints.1-7-1', 'game.hints.1-7-2', 'game.hints.1-7-3'],
  optimalSteps: 2,
}

// Level 1-8: Window Switching (was 1-9)
const level1_8: LevelDefinition = {
  id: '1-8',
  chapter: 1,
  level: 8,
  titleKey: 'levels.1-8.title',
  descriptionKey: 'levels.1-8.description',
  type: 'navigation',
  initialState: (() => {
    const w1 = makeWindow('w1', 'alpha', paneNode('p1', ['Window Alpha']), 'p1')
    const w2 = makeWindow('w2', 'beta', paneNode('p2', ['Window Beta']), 'p2')
    const w3 = makeWindow('w3', 'gamma', paneNode('p3', ['>>> GO HERE <<<']), 'p3')
    const sess = makeSession('s1', '0', [w1, w2, w3], 0)
    return makeState([sess], 's1')
  })(),
  availableCommands: ['next-window', 'previous-window', 'select-window'],
  objectives: [
    {
      id: 'switch-to-window-2',
      descriptionKey: 'levels.1-8.description',
      validate: (state) => {
        const sess = getActiveSession(state)
        return !!sess && sess.activeWindowIndex === 2
      },
    },
  ],
  hints: ['game.hints.1-8-1', 'game.hints.1-8-2', 'game.hints.1-8-3'],
  optimalSteps: 1,
}

// Level 1-9: Window Naming (was 1-10)
const level1_9: LevelDefinition = {
  id: '1-9',
  chapter: 1,
  level: 9,
  titleKey: 'levels.1-9.title',
  descriptionKey: 'levels.1-9.description',
  type: 'workspace',
  initialState: (() => {
    const w1 = makeWindow('w1', 'bash', paneNode('p1'), 'p1')
    const w2 = makeWindow('w2', 'bash', paneNode('p2'), 'p2')
    const w3 = makeWindow('w3', 'bash', paneNode('p3'), 'p3')
    const sess = makeSession('s1', '0', [w1, w2, w3], 0)
    return makeState([sess], 's1')
  })(),
  availableCommands: ['rename-window', 'next-window', 'select-window'],
  objectives: [
    {
      id: 'name-editor',
      descriptionKey: 'game.objectives.1-9-editor',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        return sess.windows.some(w => w.name === 'editor')
      },
    },
    {
      id: 'name-server',
      descriptionKey: 'game.objectives.1-9-server',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        return sess.windows.some(w => w.name === 'server')
      },
    },
    {
      id: 'name-logs',
      descriptionKey: 'game.objectives.1-9-logs',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        return sess.windows.some(w => w.name === 'logs')
      },
    },
  ],
  hints: ['game.hints.1-9-1', 'game.hints.1-9-2', 'game.hints.1-9-3'],
  optimalSteps: 5,
}

// Level 1-10: Detach & Attach (was 1-11)
const level1_10: LevelDefinition = {
  id: '1-10',
  chapter: 1,
  level: 10,
  titleKey: 'levels.1-10.title',
  descriptionKey: 'levels.1-10.description',
  type: 'tutorial',
  initialState: singlePaneState('mywork'),
  availableCommands: ['detach', 'attach'],
  objectives: [
    {
      id: 'detach-and-attach',
      descriptionKey: 'levels.1-10.description',
      validate: (state) => !state.isDetached && state.sessions.length >= 1,
    },
  ],
  hints: ['game.hints.1-10-1', 'game.hints.1-10-2', 'game.hints.1-10-3'],
  optimalSteps: 2,
  tutorialSteps: [
    { messageKey: 'game.tutorial.1-10-step1', expectedCommand: 'detach' },
    { messageKey: 'game.tutorial.1-10-step2', expectedCommand: 'attach' },
  ],
}

// Level 1-11: Final Exam (was 1-12)
const level1_11: LevelDefinition = {
  id: '1-11',
  chapter: 1,
  level: 11,
  titleKey: 'levels.1-11.title',
  descriptionKey: 'levels.1-11.description',
  type: 'workspace',
  initialState: singlePaneState(),
  availableCommands: ['new-window', 'rename-window', 'split-horizontal', 'split-vertical', 'select-pane', 'next-window', 'select-window'],
  objectives: [
    {
      id: 'editor-window',
      descriptionKey: 'game.objectives.1-11-editor',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        const editorWin = sess.windows.find(w => w.name === 'editor')
        return !!editorWin && countPanesInTree(editorWin.layoutTree) === 2 &&
          editorWin.layoutTree.type === 'split' && editorWin.layoutTree.direction === 'vertical'
      },
    },
    {
      id: 'server-window',
      descriptionKey: 'game.objectives.1-11-server',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        const serverWin = sess.windows.find(w => w.name === 'server')
        return !!serverWin && countPanesInTree(serverWin.layoutTree) === 1
      },
    },
    {
      id: 'logs-window',
      descriptionKey: 'game.objectives.1-11-logs',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        const logsWin = sess.windows.find(w => w.name === 'logs')
        return !!logsWin && countPanesInTree(logsWin.layoutTree) === 2 &&
          logsWin.layoutTree.type === 'split' && logsWin.layoutTree.direction === 'horizontal'
      },
    },
  ],
  hints: ['game.hints.1-11-1', 'game.hints.1-11-2', 'game.hints.1-11-3'],
  optimalSteps: 8,
}

export const chapter1Levels: LevelDefinition[] = [
  level1_1, level1_2, level1_3, level1_4, level1_5,
  level1_6, level1_7, level1_8, level1_9, level1_10, level1_11,
]

export default chapter1Levels
