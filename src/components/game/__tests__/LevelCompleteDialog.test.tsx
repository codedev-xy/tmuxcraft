import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { chapter1Levels } from '@/game/levels/chapter1'
import type { StarRating } from '@/game/level-types'
import { LevelCompleteDialog } from '../LevelCompleteDialog'

const LEVEL = chapter1Levels[1]

function show(stars: StarRating, hasNext = true) {
  const actions = { onNext: vi.fn(), onRetry: vi.fn(), onBack: vi.fn() }
  render(<LevelCompleteDialog open level={LEVEL} stars={stars} commandCount={7} hasNext={hasNext} {...actions} />)
  const row = (star: string) => screen.getByText(i18n.t(`game.stars.${star}`)).closest('li')!
  return { ...actions, row, dialog: screen.getByRole('dialog', { name: i18n.t('game.levelComplete') }) }
}

beforeAll(() => i18n.changeLanguage('en'))

describe('LevelCompleteDialog', () => {
  it('says which stars were earned and which were missed', () => {
    const { row } = show({ completed: true, efficient: false, noHints: true })
    expect(row('completed')).toHaveTextContent(i18n.t('game.starEarned'))
    expect(row('efficient')).toHaveTextContent(i18n.t('game.starMissed'))
    expect(row('noHints')).toHaveTextContent(i18n.t('game.starEarned'))
    expect(screen.getByRole('img', { name: i18n.t('common.starsEarned', { count: 2 }) })).toBeInTheDocument()
  })

  it('compares the commands used with the optimal count', () => {
    const { dialog } = show({ completed: true, efficient: false, noHints: true })
    expect(within(dialog).getByText(i18n.t('game.commandsUsed')).parentElement).toHaveTextContent('7')
    expect(within(dialog).getByText(i18n.t('game.optimal')).parentElement).toHaveTextContent(String(LEVEL.optimalSteps))
  })

  it('wires each button to its action', async () => {
    const user = userEvent.setup()
    const { onNext, onRetry, onBack } = show({ completed: true, efficient: true, noHints: true })
    await user.click(screen.getByRole('button', { name: new RegExp(i18n.t('game.nextLevel')) }))
    await user.click(screen.getByRole('button', { name: new RegExp(i18n.t('game.retry')) }))
    await user.click(screen.getByRole('button', { name: i18n.t('game.backToLevels') }))
    expect([onNext, onRetry, onBack].map(action => action.mock.calls.length)).toEqual([1, 1, 1])
  })

  it('cannot be dismissed with Escape', async () => {
    const user = userEvent.setup()
    show({ completed: true, efficient: true, noHints: true })
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
