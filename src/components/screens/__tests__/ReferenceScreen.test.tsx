import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { REFERENCE_ENTRIES } from '@/game/reference'
import { useGameStore } from '@/store/game-store'
import { ReferenceScreen } from '../ReferenceScreen'

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(() => useGameStore.getState().setScreen('reference'))

describe('ReferenceScreen', () => {
  it('has a heading and the whole list with its count', () => {
    render(<ReferenceScreen />)
    expect(screen.getByRole('heading', { level: 1, name: /Command Reference/ })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(REFERENCE_ENTRIES.length)
    expect(screen.getByText(`${REFERENCE_ENTRIES.length} entries`)).toBeInTheDocument()
  })

  it('narrows the list as the player types in the labelled search box', async () => {
    const user = userEvent.setup()
    render(<ReferenceScreen />)
    await user.type(screen.getByRole('searchbox', { name: 'Search commands' }), 'synchronize')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('1 entry')).toBeInTheDocument()
  })

  it('goes back home', async () => {
    const user = userEvent.setup()
    render(<ReferenceScreen />)
    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(useGameStore.getState().currentScreen).toBe('home')
  })
})
