import type { LevelDefinition } from '@/game/level-types'
import type { TmuxState, LayoutNode } from '@/core/types'
import { singlePaneState, paneNode, split, makeWindow, makeSession, makeState } from '../helpers'
// layout-engine imports not needed after merge

function countPanesInTree(node: LayoutNode): number {
  if (node.type === 'pane') return 1
  if (node.children) return countPanesInTree(node.children[0]) + countPanesInTree(node.children[1])
  return 0
}

function getActiveSession(state: TmuxState) {
  return state.sessions.find(s => s.id === state.activeSessionId)
}

function getActiveWindow(state: TmuxState) {
  const sess = getActiveSession(state)
  return sess?.windows[sess.activeWindowIndex]
}

function getTreeRatio(tree: LayoutNode): number {
  return tree.ratio ?? 0.5
}

// Level 2-1: Resize Panes
const level2_1: LevelDefinition = {
  id: '2-1',
  chapter: 2,
  level: 1,
  titleKey: 'levels.2-1.title',
  descriptionKey: 'levels.2-1.description',
  type: 'layout_puzzle',
  initialState: (() => {
    const tree = split('vertical', paneNode('p1'), paneNode('p2'))
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['resize-pane', 'select-pane'],
  objectives: [
    {
      id: 'resize-to-70-30',
      descriptionKey: 'levels.2-1.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        if (!win) return false
        const ratio = getTreeRatio(win.layoutTree)
        // Accept if ratio is roughly 70/30 (0.65-0.75)
        return ratio >= 0.65 && ratio <= 0.75
      },
    },
  ],
  hints: ['game.hints.2-1-1', 'game.hints.2-1-2', 'game.hints.2-1-3'],
  optimalSteps: 4,
}

// Level 2-2: Preset Layouts
const level2_2: LevelDefinition = {
  id: '2-2',
  chapter: 2,
  level: 2,
  titleKey: 'levels.2-2.title',
  descriptionKey: 'levels.2-2.description',
  type: 'layout_puzzle',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1'),
      split('horizontal', paneNode('p2'), paneNode('p3'))
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['next-layout', 'select-layout'],
  objectives: [
    {
      id: 'even-horizontal-layout',
      descriptionKey: 'levels.2-2.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        if (!win) return false
        // Check that the top-level split is horizontal (even-horizontal makes all panes side by side)
        return win.layoutTree.type === 'split' && win.layoutTree.direction === 'vertical' &&
          countPanesInTree(win.layoutTree) === 3
      },
    },
  ],
  hints: ['game.hints.2-2-1', 'game.hints.2-2-2', 'game.hints.2-2-3'],
  optimalSteps: 2,
}

// Level 2-3: Swap Panes
const level2_3: LevelDefinition = {
  id: '2-3',
  chapter: 2,
  level: 3,
  titleKey: 'levels.2-3.title',
  descriptionKey: 'levels.2-3.description',
  type: 'fix_layout',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1', ['Panel B - Should be on RIGHT']),
      paneNode('p2', ['Panel A - Should be on LEFT'])
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['swap-pane', 'select-pane'],
  objectives: [
    {
      id: 'swap-panes',
      descriptionKey: 'levels.2-3.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        if (!win || win.layoutTree.type !== 'split' || !win.layoutTree.children) return false
        const leftPane = win.layoutTree.children[0]
        const rightPane = win.layoutTree.children[1]
        // After swap: left should have "Panel A", right should have "Panel B"
        return leftPane.type === 'pane' && leftPane.pane?.content.some(l => l.includes('Panel A')) === true &&
          rightPane.type === 'pane' && rightPane.pane?.content.some(l => l.includes('Panel B')) === true
      },
    },
  ],
  hints: ['game.hints.2-3-1', 'game.hints.2-3-2', 'game.hints.2-3-3'],
  optimalSteps: 1,
}

// Level 2-4: Pane-Window Conversion (merged from old 2-4 Break + 2-5 Join)
const level2_4: LevelDefinition = {
  id: '2-4',
  chapter: 2,
  level: 4,
  titleKey: 'levels.2-4.title',
  descriptionKey: 'levels.2-4.description',
  type: 'fix_layout',
  initialState: (() => {
    const w1 = makeWindow('w1', 'main', paneNode('p1', ['Main Window']), 'p1')
    const w2 = makeWindow('w2', 'temp', paneNode('p2', ['Temporary Task']), 'p2')
    const sess = makeSession('s1', '0', [w1, w2], 0)
    return makeState([sess], 's1')
  })(),
  availableCommands: ['break-pane', 'join-pane', 'select-pane', 'select-window'],
  objectives: [
    {
      id: 'convert-pane-window',
      descriptionKey: 'game.objectives.2-4-convert',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        // Must have 2 windows and none named 'temp'
        return sess.windows.length === 2 && !sess.windows.some(w => w.name === 'temp')
      },
    },
  ],
  hints: ['game.hints.2-4-1', 'game.hints.2-4-2', 'game.hints.2-4-3'],
  optimalSteps: 2,
}

// Level 2-5: Copy Mode (merged from old 2-6 Enter Copy + 2-7 Copy & Paste)
const level2_5: LevelDefinition = {
  id: '2-5',
  chapter: 2,
  level: 5,
  titleKey: 'levels.2-5.title',
  descriptionKey: 'levels.2-5.description',
  type: 'text_task',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1', ['SECRET_CODE: Alpha-Bravo-Charlie']),
      paneNode('p2', ['Paste the secret code here:'])
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['enter-copy-mode', 'copy-selection', 'paste', 'select-pane'],
  objectives: [
    {
      id: 'copy-mode-complete',
      descriptionKey: 'levels.2-5.description',
      validate: (state) => {
        return state.clipboard.length > 0
      },
    },
  ],
  hints: ['game.hints.2-5-1', 'game.hints.2-5-2', 'game.hints.2-5-3'],
  optimalSteps: 1,
}

// Level 2-6: Synchronize Panes (was 2-8)
const level2_6: LevelDefinition = {
  id: '2-6',
  chapter: 2,
  level: 6,
  titleKey: 'levels.2-6.title',
  descriptionKey: 'levels.2-6.description',
  type: 'workspace',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1', ['Server 1']),
      split('horizontal',
        paneNode('p2', ['Server 2']),
        paneNode('p3', ['Server 3'])
      )
    )
    const win = makeWindow('w1', 'servers', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['synchronize-panes', 'set-window-option'],
  objectives: [
    {
      id: 'sync-panes',
      descriptionKey: 'levels.2-6.description',
      validate: (state) => {
        const win = getActiveWindow(state)
        return !!win && win.synchronizePanes === true
      },
    },
  ],
  hints: ['game.hints.2-6-1', 'game.hints.2-6-2', 'game.hints.2-6-3'],
  optimalSteps: 1,
}

// Level 2-7: Session Management (was 2-9)
const level2_7: LevelDefinition = {
  id: '2-7',
  chapter: 2,
  level: 7,
  titleKey: 'levels.2-7.title',
  descriptionKey: 'levels.2-7.description',
  type: 'navigation',
  initialState: singlePaneState('default'),
  availableCommands: ['new-session', 'switch-session', 'rename-session', 'list-sessions'],
  objectives: [
    {
      id: 'create-named-sessions',
      descriptionKey: 'game.objectives.2-7-sessions',
      validate: (state) => {
        const names = state.sessions.map(s => s.name)
        return names.includes('dev') && names.includes('staging')
      },
    },
    {
      id: 'switch-to-dev',
      descriptionKey: 'game.objectives.2-7-switch',
      validate: (state) => {
        const active = state.sessions.find(s => s.id === state.activeSessionId)
        return active?.name === 'dev'
      },
    },
  ],
  hints: ['game.hints.2-7-1', 'game.hints.2-7-2', 'game.hints.2-7-3'],
  optimalSteps: 3,
}

// Level 2-8: Final Exam - Multi-Service Debug Environment (was 2-10)
const level2_8: LevelDefinition = {
  id: '2-8',
  chapter: 2,
  level: 8,
  titleKey: 'levels.2-8.title',
  descriptionKey: 'levels.2-8.description',
  type: 'workspace',
  initialState: singlePaneState(),
  availableCommands: [
    'new-session', 'new-window', 'rename-window', 'split-horizontal', 'split-vertical',
    'select-pane', 'select-window', 'next-window', 'resize-pane', 'switch-session',
    'synchronize-panes',
  ],
  objectives: [
    {
      id: 'two-sessions',
      descriptionKey: 'game.objectives.2-8-sessions',
      validate: (state) => state.sessions.length >= 2,
    },
    {
      id: 'four-windows-total',
      descriptionKey: 'game.objectives.2-8-windows',
      validate: (state) => {
        const totalWindows = state.sessions.reduce((sum, s) => sum + s.windows.length, 0)
        return totalWindows >= 4
      },
    },
    {
      id: 'has-sync-window',
      descriptionKey: 'game.objectives.2-8-sync',
      validate: (state) => {
        return state.sessions.some(s =>
          s.windows.some(w => w.synchronizePanes === true)
        )
      },
    },
  ],
  hints: ['game.hints.2-8-1', 'game.hints.2-8-2', 'game.hints.2-8-3'],
  optimalSteps: 12,
}

export const chapter2Levels: LevelDefinition[] = [
  level2_1, level2_2, level2_3, level2_4, level2_5,
  level2_6, level2_7, level2_8,
]

export default chapter2Levels
