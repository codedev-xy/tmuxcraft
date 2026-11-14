import { describe, it, expect, beforeAll } from 'vitest'
import i18n from '@/i18n'
import { openTerminal } from './terminal-harness'

beforeAll(() => i18n.changeLanguage('en'))

const SOURCES = import.meta.glob<string>('../*.tsx', { query: '?raw', import: 'default', eager: true })
const TERMINAL_FILES = [
  'TerminalView.tsx', 'PaneRenderer.tsx', 'PaneView.tsx', 'PaneDivider.tsx', 'CommandLine.tsx',
  'OutputLog.tsx', 'PromptLine.tsx', 'FileEditor.tsx', 'TmuxStatusBar.tsx',
]

describe('terminal styling', () => {
  it.each(TERMINAL_FILES)('%s has no fixed colours', file => {
    const source = SOURCES[`../${file}`]
    expect(source).toBeTypeOf('string')
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i)
    expect(source).not.toMatch(/(?:padding|margin|background|color|border)\s*:/)
  })

  it('marks the terminal as dark', () => {
    const { view } = openTerminal()
    expect(view.container.firstElementChild).toHaveClass('on-dark')
  })
})
