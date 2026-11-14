import { describe, it, expect } from 'vitest'
import { deepFreeze } from '@/core/__tests__/shell-engine'
import { nextIdAfter, OUTER_PANE_ID } from '@/core/state'
import type { LayoutNode, Pane, TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { simulate } from '@/game/sim/simulate'
import type { PlayerInput } from '@/game/sim/simulate'
import { chapter1Levels } from '../chapter1'
import { chapter2Levels } from '../chapter2'
import { chapter3Levels } from '../chapter3'

const CHAPTERS: readonly (readonly [number, readonly LevelDefinition[], number])[] = [
  [1, chapter1Levels, 11],
  [2, chapter2Levels, 8],
  [3, chapter3Levels, 7],
]

const ALL_LEVELS = CHAPTERS.flatMap(([, levels]) => levels)

const line = (text: string): PlayerInput => ({ type: 'line', text })
const key = (name: string): PlayerInput => ({ type: 'key', key: name })

function treePanes(node: LayoutNode): Pane[] {
  if (node.pane) return [node.pane]
  return node.children ? node.children.flatMap(treePanes) : []
}

function allIds(state: TmuxState): string[] {
  return state.sessions.flatMap(session => [
    session.id,
    ...session.windows.flatMap(window => [window.id, ...treePanes(window.layoutTree).map(pane => pane.id)]),
  ])
}

function levelById(id: string): LevelDefinition {
  const level = ALL_LEVELS.find(candidate => candidate.id === id)
  if (!level) throw new Error(`no level ${id}`)
  return level
}

function objectivesMet(level: LevelDefinition, state: TmuxState): boolean[] {
  return level.objectives.map(objective => objective.validate(state))
}

describe.each(CHAPTERS)('chapter %i', (chapter, levels, expectedCount) => {
  it(`has ${expectedCount} levels`, () => {
    expect(levels).toHaveLength(expectedCount)
  })

  it('numbers its levels "<chapter>-<level>" in order', () => {
    levels.forEach((level, index) => {
      expect(level.id).toBe(`${chapter}-${index + 1}`)
      expect(level.chapter).toBe(chapter)
      expect(level.level).toBe(index + 1)
    })
  })
})

describe.each(ALL_LEVELS.map(level => [level.id, level] as const))('level %s', (_id, level) => {
  const state = level.initialState

  it('has a structurally sound initial state', () => {
    if (!state.isDetached) {
      expect(state.sessions.map(session => session.id)).toContain(state.activeSessionId)
    }
    for (const session of state.sessions) {
      expect(session.activeWindowIndex).toBeGreaterThanOrEqual(0)
      expect(session.activeWindowIndex).toBeLessThan(session.windows.length)
      for (const window of session.windows) {
        const panes = treePanes(window.layoutTree)
        expect(panes.map(pane => pane.id)).toContain(window.activePaneId)
        for (const pane of panes) {
          expect(Array.isArray(pane.content)).toBe(true)
          expect(typeof pane.input).toBe('string')
        }
      }
    }
    const ids = allIds(state)
    expect(new Set(ids).size).toBe(ids.length)
    expect(state.nextId).toBeGreaterThanOrEqual(nextIdAfter(state.sessions))
  })

  it('has the fields the new engine needs', () => {
    expect(Object.values(state.options).every(value => typeof value === 'string')).toBe(true)
    expect(Object.keys(state.keyTables.prefix).length).toBeGreaterThan(0)
    expect(state.log).toEqual([])
    expect(state.prompt).toBeNull()
    expect(state.copyMode).toBeNull()
    expect(state.editing).toBeNull()
    expect(state.prefixPending).toBe(false)
    expect(state.outer.id).toBe(OUTER_PANE_ID)
  })

  it('evaluates every objective on the initial state', () => {
    for (const result of objectivesMet(level, state)) {
      expect(typeof result).toBe('boolean')
    }
  })

  it('takes input without mutating the initial state', () => {
    const frozen = deepFreeze(state)
    const run = simulate(frozen, [line('echo hi'), key('C-b'), key('%')])
    for (const result of objectivesMet(level, run.state)) {
      expect(typeof result).toBe('boolean')
    }
  })
})

describe('validators on new-engine state', () => {
  it('1-6 completes when p2 is active and the window is zoomed', () => {
    const level = levelById('1-6')
    const run = simulate(level.initialState, [line(':select-pane -R'), line(':resize-pane -Z')])
    expect(objectivesMet(level, run.state)).toEqual([true])
  })

  it('1-6 does not complete when the wrong pane is zoomed', () => {
    const level = levelById('1-6')
    const run = simulate(level.initialState, [line(':resize-pane -Z')])
    expect(objectivesMet(level, run.state)).toEqual([false])
  })

  it('3-3 completes once a status option is set', () => {
    const level = levelById('3-3')
    const run = simulate(level.initialState, [line(':set -g status-style bg=red')])
    expect(objectivesMet(level, run.state)).toEqual([true])
  })

  it('3-4 completes once a config file is sourced', () => {
    const level = levelById('3-4')
    const run = simulate(level.initialState, [
      { type: 'save', path: '~/.tmux.conf', text: 'set -g mouse on' },
      line(':source-file ~/.tmux.conf'),
    ])
    expect(objectivesMet(level, run.state)).toEqual([true])
  })

  it('3-4 does not complete when sourcing a missing file fails', () => {
    const level = levelById('3-4')
    const run = simulate(level.initialState, [line(':source-file ~/missing.conf')])
    expect(objectivesMet(level, run.state)).toEqual([false])
  })
})
