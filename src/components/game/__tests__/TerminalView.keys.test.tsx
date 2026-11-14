import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { act, fireEvent, screen, within } from '@testing-library/react'
import i18n from '@/i18n'
import { PREFIX_TIMEOUT_MS } from '../TerminalView'
import { afterLines, openTerminal } from './terminal-harness'

const log = () => screen.getByRole('log')
const badge = (text = 'Prefix Ctrl+b') => screen.queryByText(text)

beforeAll(() => i18n.changeLanguage('en'))
afterAll(() => i18n.changeLanguage('en'))
afterEach(() => vi.useRealTimers())

describe('prefix badge', () => {
  it('goes away after a key that is not bound, with its error in the log', async () => {
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}')
    expect(badge()).toBeInTheDocument()
    await user.keyboard('Q')
    expect(badge()).not.toBeInTheDocument()
    expect(within(log()).getByText(/Q/)).toBeInTheDocument()
    expect(commandBox()).toHaveValue('')
  })

  it('goes away on Escape', async () => {
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}')
    await user.keyboard('{Escape}')
    expect(badge()).not.toBeInTheDocument()
  })

  it('times out even after several prefixes in a row', () => {
    vi.useFakeTimers()
    openTerminal()
    fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true })
    act(() => { vi.advanceTimersByTime(PREFIX_TIMEOUT_MS - 100) })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true })
    expect(badge()).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(PREFIX_TIMEOUT_MS) })
    expect(badge()).not.toBeInTheDocument()
  })

  it('shows the prefix that is set', async () => {
    const { user, commandBox } = openTerminal(afterLines(':set -g prefix C-a'))
    await user.click(commandBox())
    await user.keyboard('{Control>}a{/Control}')
    expect(badge('Prefix Ctrl+a')).toBeInTheDocument()
  })

  it('is translated', async () => {
    await i18n.changeLanguage('zh')
    const { user } = openTerminal()
    await user.click(screen.getByRole('textbox', { name: '命令' }))
    await user.keyboard('{Control>}b{/Control}')
    expect(badge('前缀 Ctrl+b')).toBeInTheDocument()
    await i18n.changeLanguage('en')
  })
})

describe('commands behind keys in the log', () => {
  it('shows the keys and the command they ran, apart from typed lines', async () => {
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}%')
    const line = within(log()).getByText('split-window -h').closest('[data-kind]')
    expect(line).toHaveAttribute('data-kind', 'command')
    expect(line).toHaveTextContent('Ctrl+b %')
  })

  it('says nothing when a key only opens a prompt', async () => {
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}:')
    expect(log().querySelector('[data-kind]')).toBeNull()
  })
})

describe('listing output in the log', () => {
  it.each(['s', 'w', '?'])('shows the output of prefix %s', async key => {
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard(`{Control>}b{/Control}${key}`)
    const output = log().querySelectorAll('[data-kind="output"]')
    expect(output.length).toBeGreaterThan(0)
    expect(log()).toHaveTextContent(key === '?' ? 'split-window' : '0:')
  })

  it('prints a typed tmux ls into the pane, as a shell would', async () => {
    const { user, commandBox, panes } = openTerminal()
    await user.type(commandBox(), 'tmux ls{Enter}')
    expect(panes()[0]).toHaveTextContent('0:')
    expect(log()).toHaveTextContent('tmux ls')
  })

  it('scrolls to the newest line', async () => {
    const height = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    const { user, commandBox } = openTerminal()
    await user.click(commandBox())
    await user.keyboard('{Control>}b{/Control}?')
    expect(log().scrollTop).toBe(900)
    expect(log()).toHaveClass('overflow-y-auto')
    height.mockRestore()
  })
})

describe('typo suggestion', () => {
  it.each([
    ['en', 'Did you mean'],
    ['zh', '你是不是想'],
  ])('suggests split-window for splt-window (%s)', async (lang, phrase) => {
    await i18n.changeLanguage(lang)
    const { user } = openTerminal()
    const box = screen.getByRole('textbox', { name: i18n.t('game.commandBox') })
    await user.type(box, 'tmux splt-window{Enter}')
    const error = within(log()).getByText(/split-window/, { selector: '[data-kind="error"]' })
    expect(error.textContent).toContain(i18n.t('errors.didYouMean', { command: 'split-window' }))
    expect(error.textContent?.toLowerCase()).toContain(phrase.toLowerCase())
    await i18n.changeLanguage('en')
  })
})
