import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { QuickReferenceDialog } from '../QuickReferenceDialog'

beforeAll(() => i18n.changeLanguage('en'))

describe('QuickReferenceDialog', () => {
  it('filters the compact reference list by what is typed in the search box', async () => {
    const user = userEvent.setup()
    render(<QuickReferenceDialog open onClose={() => {}} />)
    const search = screen.getByRole('searchbox', { name: i18n.t('game.searchCommands') })
    expect(search).toHaveFocus()
    await user.type(search, 'split')
    const list = screen.getByTestId('reference-list')
    expect(list).toHaveAttribute('data-query', 'split')
    expect(list).toHaveAttribute('data-compact', 'true')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<QuickReferenceDialog open onClose={onClose} />)
    await userEvent.setup().keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing while closed', () => {
    render(<QuickReferenceDialog open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
