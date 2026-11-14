import { describe, it, expect, beforeAll } from 'vitest'
import { screen, within } from '@testing-library/react'
import i18n from '@/i18n'
import { afterLines, openTerminal } from './terminal-harness'

beforeAll(() => i18n.changeLanguage('en'))

describe('copy mode in a pane', () => {
  async function enterCopyMode() {
    const terminal = openTerminal(afterLines('echo hello'))
    await terminal.user.click(terminal.commandBox())
    await terminal.user.keyboard('{Control>}b{/Control}[[')
    const pane = terminal.panes()[0]
    return { ...terminal, pane }
  }

  it('tags the pane and swaps the blinking cursor for a copy cursor', async () => {
    const { pane } = await enterCopyMode()
    expect(within(pane).getByText('Copy mode')).toBeInTheDocument()
    expect(pane.querySelector('[data-cursor="copy"]')).toHaveClass('bg-term-warning')
    expect(pane.querySelector('[data-cursor="prompt"]')).toBeNull()
  })

  it('shows the selection apart from the cursor', async () => {
    const { user, pane } = await enterCopyMode()
    await user.keyboard(' ll')
    const selected = pane.querySelectorAll('[data-selected]')
    expect(selected.length).toBe(3)
    expect(selected[0]).toHaveClass('bg-term-select')
    expect(pane.querySelector('[data-cursor="copy"]')).toBe(selected[2])
  })

  it('goes back to the blinking prompt cursor when copy mode ends', async () => {
    const { user, pane } = await enterCopyMode()
    await user.keyboard('q')
    expect(screen.queryByText('Copy mode')).not.toBeInTheDocument()
    expect(pane.querySelector('[data-cursor="prompt"]')).toHaveClass('animate-blink')
  })
})
