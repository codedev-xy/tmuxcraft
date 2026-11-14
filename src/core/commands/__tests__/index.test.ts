import { describe, it, expect } from 'vitest'
import { COMMANDS } from '../index'
import { TMUX_COMMAND_ALIASES } from '../tmux-names'

describe('command table', () => {
  it('has unique names and aliases', () => {
    const words = COMMANDS.flatMap(spec => [spec.name, ...(spec.aliases ?? [])])
    expect(new Set(words).size).toBe(words.length)
  })

  it('only holds real tmux commands, under their real names and aliases', () => {
    for (const spec of COMMANDS) {
      expect(Object.keys(TMUX_COMMAND_ALIASES)).toContain(spec.name)
      for (const alias of spec.aliases ?? []) expect(TMUX_COMMAND_ALIASES[spec.name]).toBe(alias)
    }
  })
})
