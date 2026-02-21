import type { ChallengeGoal, ChallengeDifficulty } from '../level-types'
import type { TmuxState } from '@/core/types'

type Lang = 'zh' | 'en'

const WINDOW_NAMES = ['code', 'server', 'logs', 'tests', 'docs', 'deploy', 'monitor', 'db', 'api', 'web']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getActiveSession(state: TmuxState) {
  return state.sessions.find(s => s.id === state.activeSessionId)
}

function countPanes(node: import('@/core/types').LayoutNode): number {
  if (node.type === 'pane') return 1
  if (node.children) return countPanes(node.children[0]) + countPanes(node.children[1])
  return 0
}

const layoutDescMap: Record<string, Record<Lang, string>> = {
  single: { zh: '单面板', en: 'single pane' },
  horizontal: { zh: '上下分割', en: 'top/bottom split' },
  vertical: { zh: '左右分割', en: 'left/right split' },
}

export function generateChallenge(difficulty: ChallengeDifficulty, lang: Lang = 'zh'): ChallengeGoal {
  switch (difficulty) {
    case 'beginner': return generateBeginner(lang)
    case 'intermediate': return generateIntermediate(lang)
    case 'advanced': return generateAdvanced(lang)
  }
}

function generateBeginner(lang: Lang): ChallengeGoal {
  const numWindows = randInt(2, 4)
  const names = []
  const layouts: string[] = []
  for (let i = 0; i < numWindows; i++) {
    const name = WINDOW_NAMES[i]
    names.push(name)
    const layout = pick(['single', 'horizontal', 'vertical'])
    layouts.push(layout)
  }

  const windowDescs = names.map((n, i) => `"${n}" (${layoutDescMap[layouts[i]][lang]})`).join(lang === 'zh' ? '、' : ', ')
  const description = lang === 'zh'
    ? `创建 ${numWindows} 个窗口：${windowDescs}`
    : `Create ${numWindows} windows: ${windowDescs}`

  const optimalSteps = names.reduce((acc, _, i) => {
    let steps = 1 // create window
    steps += 1 // rename window
    if (layouts[i] !== 'single') steps += 1 // split
    return acc + steps
  }, 0) - 1 // first window already exists

  return {
    description,
    optimalSteps,
    targetState: {},
    validate: (state: TmuxState) => {
      const sess = getActiveSession(state)
      if (!sess) return false
      if (sess.windows.length < numWindows) return false
      for (let i = 0; i < numWindows; i++) {
        const win = sess.windows.find(w => w.name === names[i])
        if (!win) return false
        const paneCount = countPanes(win.layoutTree)
        if (layouts[i] === 'single' && paneCount !== 1) return false
        if (layouts[i] !== 'single' && paneCount < 2) return false
      }
      return true
    },
  }
}

function generateIntermediate(lang: Lang): ChallengeGoal {
  const tasks = pick([
    'resize',
    'multi-window-pane',
    'rearrange',
  ])

  switch (tasks) {
    case 'resize': {
      const numPanes = randInt(3, 5)
      const description = lang === 'zh'
        ? `在当前窗口创建 ${numPanes} 个面板，并使用 even-horizontal 布局排列`
        : `Create ${numPanes} panes in the current window and arrange them using even-horizontal layout`
      return {
        description,
        optimalSteps: numPanes,
        targetState: {},
        validate: (state) => {
          const win = getActiveSession(state)?.windows[getActiveSession(state)?.activeWindowIndex ?? 0]
          return !!win && countPanes(win.layoutTree) >= numPanes
        },
      }
    }
    case 'multi-window-pane': {
      const description = lang === 'zh'
        ? '创建 2 个窗口："dev" 包含 4 个面板（2x2 网格），"prod" 包含 2 个水平面板'
        : 'Create 2 windows: "dev" with 4 panes (2x2 grid) and "prod" with 2 horizontal panes'
      return {
        description,
        optimalSteps: 10,
        targetState: {},
        validate: (state) => {
          const sess = getActiveSession(state)
          if (!sess) return false
          const dev = sess.windows.find(w => w.name === 'dev')
          const prod = sess.windows.find(w => w.name === 'prod')
          return !!dev && countPanes(dev.layoutTree) >= 4 && !!prod && countPanes(prod.layoutTree) >= 2
        },
      }
    }
    default: {
      const numPanes = randInt(3, 4)
      const description = lang === 'zh'
        ? `创建 ${numPanes} 个面板并应用 tiled 布局`
        : `Create ${numPanes} panes and apply tiled layout`
      return {
        description,
        optimalSteps: numPanes + 1,
        targetState: {},
        validate: (state) => {
          const win = getActiveSession(state)?.windows[getActiveSession(state)?.activeWindowIndex ?? 0]
          return !!win && countPanes(win.layoutTree) >= numPanes
        },
      }
    }
  }
}

function generateAdvanced(lang: Lang): ChallengeGoal {
  const description = lang === 'zh'
    ? '创建 2 个会话："work" 包含 3 个窗口（code/test/deploy），"monitor" 包含 2 个窗口（logs/metrics）。每个窗口至少 2 个面板。'
    : 'Create 2 sessions: "work" with 3 windows (code/test/deploy) and "monitor" with 2 windows (logs/metrics). Each window should have at least 2 panes.'
  return {
    description,
    optimalSteps: 15,
    targetState: {},
    validate: (state) => {
      const work = state.sessions.find(s => s.name === 'work')
      const monitor = state.sessions.find(s => s.name === 'monitor')
      if (!work || !monitor) return false
      if (work.windows.length < 3 || monitor.windows.length < 2) return false
      const allWindows = [...work.windows, ...monitor.windows]
      return allWindows.every(w => countPanes(w.layoutTree) >= 2)
    },
  }
}
