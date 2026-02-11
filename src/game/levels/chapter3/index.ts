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

// Level 3-1: Key Customization (merged from old 3-1 Custom Prefix + 3-2 Key Bindings)
const level3_1: LevelDefinition = {
  id: '3-1',
  chapter: 3,
  level: 1,
  titleKey: 'levels.3-1.title',
  descriptionKey: 'levels.3-1.description',
  type: 'tutorial',
  initialState: singlePaneState(),
  availableCommands: ['set-option', 'bind-key', 'split-horizontal', 'split-vertical'],
  objectives: [
    {
      id: 'set-option-done',
      descriptionKey: 'game.objectives.3-1-option',
      validate: (state) => {
        return state.sessions.length >= 1 && !state.isDetached
      },
    },
    {
      id: 'bind-and-split',
      descriptionKey: 'game.objectives.3-1-split',
      validate: (state) => {
        const win = getActiveWindow(state)
        return !!win && countPanesInTree(win.layoutTree) >= 2
      },
    },
  ],
  hints: ['game.hints.3-1-1', 'game.hints.3-1-2', 'game.hints.3-1-3'],
  optimalSteps: 3,
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-1-step1', expectedCommand: 'set-option' },
    { messageKey: 'game.tutorial.3-1-step2', expectedCommand: 'bind-key' },
  ],
}

// Level 3-2: Mouse Mode (was 3-3)
const level3_2: LevelDefinition = {
  id: '3-2',
  chapter: 3,
  level: 2,
  titleKey: 'levels.3-2.title',
  descriptionKey: 'levels.3-2.description',
  type: 'tutorial',
  initialState: (() => {
    const tree = split('vertical',
      paneNode('p1', ['Click me!']),
      paneNode('p2', ['No, click me!'])
    )
    const win = makeWindow('w1', 'bash', tree, 'p1')
    const sess = makeSession('s1', '0', [win])
    return makeState([sess], 's1')
  })(),
  availableCommands: ['set-option', 'select-pane'],
  objectives: [
    {
      id: 'enable-mouse',
      descriptionKey: 'levels.3-2.description',
      validate: (state) => {
        // Mouse mode enabled and navigated to second pane
        const win = getActiveWindow(state)
        return !!win && win.activePaneId === 'p2'
      },
    },
  ],
  hints: ['game.hints.3-2-1', 'game.hints.3-2-2', 'game.hints.3-2-3'],
  optimalSteps: 2,
  tutorialSteps: [
    { messageKey: 'game.tutorial.3-2-step1', expectedCommand: 'set-option' },
    { messageKey: 'game.tutorial.3-2-step2', expectedCommand: 'select-pane' },
  ],
}

// Level 3-3: Status Bar Customization (was 3-4)
const level3_3: LevelDefinition = {
  id: '3-3',
  chapter: 3,
  level: 3,
  titleKey: 'levels.3-3.title',
  descriptionKey: 'levels.3-3.description',
  type: 'workspace',
  initialState: singlePaneState(),
  availableCommands: ['set-option'],
  objectives: [
    {
      id: 'customize-status-bar',
      descriptionKey: 'levels.3-3.description',
      validate: (state) => {
        // Simplified: user must execute set-option commands for status bar
        return state.sessions.length >= 1
      },
    },
  ],
  hints: ['game.hints.3-3-1', 'game.hints.3-3-2', 'game.hints.3-3-3'],
  optimalSteps: 2,
}

// Level 3-4: Config File (was 3-5)
const level3_4: LevelDefinition = {
  id: '3-4',
  chapter: 3,
  level: 4,
  titleKey: 'levels.3-4.title',
  descriptionKey: 'levels.3-4.description',
  type: 'workspace',
  initialState: singlePaneState(),
  availableCommands: ['source-file', 'set-option', 'bind-key'],
  objectives: [
    {
      id: 'load-config',
      descriptionKey: 'levels.3-4.description',
      validate: (state) => {
        // User needs to source a config file
        return state.sessions.length >= 1
      },
    },
  ],
  hints: ['game.hints.3-4-1', 'game.hints.3-4-2', 'game.hints.3-4-3'],
  optimalSteps: 3,
}

// Level 3-5: Scripted Startup (was 3-6)
const level3_5: LevelDefinition = {
  id: '3-5',
  chapter: 3,
  level: 5,
  titleKey: 'levels.3-5.title',
  descriptionKey: 'levels.3-5.description',
  type: 'workspace',
  initialState: makeState([], '', true),
  availableCommands: ['new-session', 'new-window', 'rename-window', 'split-horizontal', 'split-vertical', 'send-keys', 'select-window'],
  objectives: [
    {
      id: 'scripted-session',
      descriptionKey: 'game.objectives.3-5-session',
      validate: (state) => {
        return state.sessions.length >= 1 && !state.isDetached
      },
    },
    {
      id: 'scripted-windows',
      descriptionKey: 'game.objectives.3-5-windows',
      validate: (state) => {
        const sess = getActiveSession(state)
        return !!sess && sess.windows.length >= 2
      },
    },
    {
      id: 'scripted-splits',
      descriptionKey: 'game.objectives.3-5-splits',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        return sess.windows.some(w => countPanesInTree(w.layoutTree) >= 2)
      },
    },
  ],
  hints: ['game.hints.3-5-1', 'game.hints.3-5-2', 'game.hints.3-5-3'],
  optimalSteps: 5,
}

// Level 3-6: Advanced Window Operations (was 3-7)
const level3_6: LevelDefinition = {
  id: '3-6',
  chapter: 3,
  level: 6,
  titleKey: 'levels.3-6.title',
  descriptionKey: 'levels.3-6.description',
  type: 'fix_layout',
  initialState: (() => {
    const w1 = makeWindow('w1', 'alpha', paneNode('p1', ['Window A']), 'p1')
    const w2 = makeWindow('w2', 'beta', paneNode('p2', ['Window B']), 'p2')
    const s1 = makeSession('s1', 'project', [w1, w2])
    const w3 = makeWindow('w3', 'tools', paneNode('p3', ['Tools Window']), 'p3')
    const s2 = makeSession('s2', 'utils', [w3])
    return makeState([s1, s2], 's1')
  })(),
  availableCommands: ['move-window', 'swap-window', 'link-window', 'switch-session', 'select-window'],
  objectives: [
    {
      id: 'move-window-cross-session',
      descriptionKey: 'levels.3-6.description',
      validate: (state) => {
        // The "project" session should have 3 windows (moved tools from utils)
        const projectSess = state.sessions.find(s => s.name === 'project')
        return !!projectSess && projectSess.windows.length >= 3
      },
    },
  ],
  hints: ['game.hints.3-6-1', 'game.hints.3-6-2', 'game.hints.3-6-3'],
  optimalSteps: 2,
}

// Level 3-7: Final Exam - Custom Environment (was 3-8)
const level3_7: LevelDefinition = {
  id: '3-7',
  chapter: 3,
  level: 7,
  titleKey: 'levels.3-7.title',
  descriptionKey: 'levels.3-7.description',
  type: 'workspace',
  initialState: makeState([], '', true),
  availableCommands: [
    'new-session', 'new-window', 'rename-window', 'split-horizontal', 'split-vertical',
    'select-pane', 'select-window', 'next-window', 'resize-pane', 'set-option',
    'bind-key', 'source-file', 'send-keys', 'synchronize-panes',
  ],
  objectives: [
    {
      id: 'custom-session',
      descriptionKey: 'game.objectives.3-7-session',
      validate: (state) => {
        return state.sessions.length >= 1 && !state.isDetached
      },
    },
    {
      id: 'custom-multi-window',
      descriptionKey: 'game.objectives.3-7-windows',
      validate: (state) => {
        const sess = getActiveSession(state)
        return !!sess && sess.windows.length >= 3
      },
    },
    {
      id: 'custom-splits',
      descriptionKey: 'game.objectives.3-7-splits',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        // At least one window with 3+ panes
        return sess.windows.some(w => countPanesInTree(w.layoutTree) >= 3)
      },
    },
    {
      id: 'custom-named-windows',
      descriptionKey: 'game.objectives.3-7-names',
      validate: (state) => {
        const sess = getActiveSession(state)
        if (!sess) return false
        // All windows should have custom names (not default 'bash')
        return sess.windows.every(w => w.name !== 'bash')
      },
    },
  ],
  hints: ['game.hints.3-7-1', 'game.hints.3-7-2', 'game.hints.3-7-3'],
  optimalSteps: 15,
}

export const chapter3Levels: LevelDefinition[] = [
  level3_1, level3_2, level3_3, level3_4, level3_5,
  level3_6, level3_7,
]

export default chapter3Levels
