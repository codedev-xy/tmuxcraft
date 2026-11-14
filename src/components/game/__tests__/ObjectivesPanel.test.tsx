import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import i18n from '@/i18n'
import { countPanes } from '@/core/layout-engine'
import { getActiveWindow } from '@/core/selectors'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition } from '@/game/level-types'
import { singlePaneState } from '@/game/levels/helpers'
import { keys } from '@/game/sim/inputs'
import { simulate } from '@/game/sim/simulate'
import { validateLevel } from '@/game/validator'
import { ObjectivesPanel } from '../ObjectivesPanel'

const panes = (state: TmuxState): number => {
  const window = getActiveWindow(state)
  return window ? countPanes(window.layoutTree) : 0
}

const LEVEL: LevelDefinition = {
  id: '9-9',
  chapter: 9,
  level: 9,
  titleKey: 'test.title',
  descriptionKey: 'test.description',
  type: 'tutorial',
  initialState: singlePaneState(),
  objectives: [{ id: 'three', descriptionKey: 'test.objective', validate: state => panes(state) === 3 }],
  hints: ['test.hint', 'test.hint', 'test.hint'],
  optimalSteps: 2,
  solution: [...keys('C-b', '%'), ...keys('C-b', '"')],
  tutorialSteps: [
    { messageKey: 'test.step1', done: state => panes(state) >= 2 },
    { messageKey: 'test.step2', done: state => panes(state) >= 3 },
  ],
}

const TEXT = {
  title: 'Three panes',
  description: 'Make three panes',
  objective: 'Have 3 panes: `Ctrl+b %` then `Ctrl+b "`',
  hint: 'Split twice',
  step1: 'Press `Ctrl+b %`',
  step2: 'Press `Ctrl+b "`',
}

function show(level: LevelDefinition, inputs = 0) {
  const state = simulate(level.initialState, level.solution.slice(0, inputs)).state
  render(
    <ObjectivesPanel
      currentLevel={level}
      state={state}
      validation={validateLevel(state, level)}
      commandCount={inputs / 2}
      objectiveFlash={false}
      efficiency={100}
      optimalSteps={level.optimalSteps}
    />,
  )
  const list = screen.queryByRole('list', { name: i18n.t('game.walkthrough') })
  const steps = list ? within(list).getAllByRole('listitem') : []
  return {
    list,
    done: steps.map(step => step.dataset.done === 'true'),
    current: steps.findIndex(step => step.getAttribute('aria-current') === 'step'),
    steps,
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
  i18n.addResourceBundle('en', 'translation', { test: TEXT }, true, true)
})

describe('ObjectivesPanel walk-through', () => {
  it('is not shown for a level without steps', () => {
    expect(show({ ...LEVEL, tutorialSteps: undefined }).list).toBeNull()
  })

  it('lists the steps and points at the first one when the level starts', () => {
    const { steps, done, current } = show(LEVEL)
    expect(steps.map(step => step.textContent)).toEqual([expect.stringContaining('Ctrl+b %'), expect.stringContaining('Ctrl+b "')])
    expect(done).toEqual([false, false])
    expect(current).toBe(0)
  })

  it('ticks a step the state shows is done and points at the next', () => {
    const { done, current } = show(LEVEL, 2)
    expect(done).toEqual([true, false])
    expect(current).toBe(1)
  })

  it('points at nothing once every step is done', () => {
    const { done, current } = show(LEVEL, 4)
    expect(done).toEqual([true, true])
    expect(current).toBe(-1)
  })

  it('shows what to press as key caps, in steps and in objectives', () => {
    const { steps } = show(LEVEL)
    expect(within(steps[0]).getByText('Ctrl+b %').tagName).toBe('KBD')
    const objective = screen.getAllByText(/Have 3 panes/)[0]
    expect(within(objective).getByText('Ctrl+b "').tagName).toBe('KBD')
  })
})
