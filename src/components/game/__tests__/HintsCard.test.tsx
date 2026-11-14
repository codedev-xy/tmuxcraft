import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { chapter1Levels } from '@/game/levels/chapter1'
import { HintsCard } from '../HintsCard'

const LEVEL = chapter1Levels[1]
const button = () => screen.getByRole('button', { name: new RegExp(i18n.t('game.showHint')) })

beforeAll(() => i18n.changeLanguage('en'))

describe('HintsCard', () => {
  it('lists the revealed hints in order, with key caps', () => {
    render(<HintsCard level={LEVEL} revealed={2} onReveal={() => {}} disabled={false} />)
    const items = within(screen.getByRole('list', { name: i18n.t('game.hint') })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1].querySelector('kbd')).not.toBeNull()
    expect(screen.getByText(i18n.t('game.hintCostPaid'))).toBeInTheDocument()
  })

  it('reveals the next hint on click', async () => {
    const onReveal = vi.fn()
    render(<HintsCard level={LEVEL} revealed={0} onReveal={onReveal} disabled={false} />)
    await userEvent.setup().click(button())
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  it('cannot reveal when told not to', () => {
    render(<HintsCard level={LEVEL} revealed={1} onReveal={() => {}} disabled />)
    expect(button()).toBeDisabled()
  })
})
