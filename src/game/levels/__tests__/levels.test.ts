import { beforeAll, describe, it, expect } from 'vitest'
import { simulate } from '@/game/sim/simulate'
import type { SimulationResult } from '@/game/sim/simulate'
import { line } from '@/game/sim/inputs'
import { validateLevel } from '@/game/validator'
import { ALL_LEVELS, completes } from './level-kit'

// What must hold for every level, whatever it teaches. Ways around a particular level are in the chapter tests.

describe.each(ALL_LEVELS.map(level => [level.id, level] as const))('level %s', (_id, level) => {
  let run: SimulationResult

  beforeAll(() => {
    run = simulate(level.initialState, level.solution)
  })

  it('is not complete when it starts', () => {
    expect(validateLevel(level.initialState, level).isComplete).toBe(false)
  })

  it('is not completed by commands that change nothing', () => {
    expect(completes(level, [line('tmux ls'), line('echo hi'), line('clear')])).toBe(false)
  })

  it('has a reference solution in which every input works', () => {
    expect(level.solution.length).toBeGreaterThan(0)
    expect(run.results.flatMap(result => result.errors)).toEqual([])
    expect(run.results.every(result => result.handled)).toBe(true)
  })

  it('is completed by its reference solution', () => {
    const result = validateLevel(run.state, level)
    expect(result.remainingObjectives).toEqual([])
    expect(result.isComplete).toBe(true)
  })

  it('counts the reference solution as optimalSteps steps', () => {
    expect(run.steps).toBe(level.optimalSteps)
  })

  it('is not complete before the reference solution ends', () => {
    for (let length = 0; length < level.solution.length; length++) {
      expect(completes(level, level.solution.slice(0, length)), `after ${length} inputs`).toBe(false)
    }
  })

  it('ticks its walk-through in order, and all of it by the end', () => {
    const steps = level.tutorialSteps ?? []
    expect(steps.map(step => step.done(level.initialState))).toEqual(steps.map(() => false))
    expect(steps.map(step => step.done(run.state))).toEqual(steps.map(() => true))
    let reached = 0
    for (let length = 1; length <= level.solution.length; length++) {
      const state = simulate(level.initialState, level.solution.slice(0, length)).state
      const done = steps.map(step => step.done(state))
      const count = done.filter(Boolean).length
      expect(done, `after ${length} inputs`).toEqual(steps.map((_step, index) => index < count))
      expect(count).toBeGreaterThanOrEqual(reached)
      reached = count
    }
  })
})
