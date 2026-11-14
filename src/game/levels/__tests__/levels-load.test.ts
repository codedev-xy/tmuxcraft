import { describe, it, expect } from 'vitest'
import { deepFreeze } from '@/core/__tests__/shell-engine'
import { nextIdAfter, OUTER_PANE_ID } from '@/core/state'
import type { LayoutNode, Pane, TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { key, line } from '@/game/sim/inputs'
import { simulate } from '@/game/sim/simulate'
import { chapter1Levels } from '../chapter1'
import { chapter2Levels } from '../chapter2'
import { chapter3Levels } from '../chapter3'

const CHAPTERS: readonly (readonly [number, readonly LevelDefinition[], number])[] = [
  [1, chapter1Levels, 11],
  [2, chapter2Levels, 8],
  [3, chapter3Levels, 7],
]

const ALL_LEVELS = CHAPTERS.flatMap(([, levels]) => levels)

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
