import { describe, it, expect } from 'vitest'
import { findCommand } from '../find'
import type { CommandSpec } from '../types'

function stub(name: string, aliases: string[] = []): CommandSpec {
  return { name, aliases, flags: {}, requiresServer: false, run: state => ({ ok: true, value: { state } }) }
}

const TABLE = [stub('split-window', ['splitw']), stub('select-pane', ['selectp']), stub('new-session', ['new'])]

function found(name: string) {
  const result = findCommand(name, TABLE)
  if (!result.ok) throw new Error(`findCommand failed: ${result.error.code}`)
  return result.value.name
}

function errorOf(name: string) {
  const result = findCommand(name, TABLE)
  if (result.ok) throw new Error(`expected an error, found ${result.value.name}`)
  return result.error
}

describe('findCommand', () => {
  it('finds a command by its full name', () => {
    expect(found('split-window')).toBe('split-window')
  })

  it('finds a command by an alias', () => {
    expect(found('splitw')).toBe('split-window')
    expect(found('new')).toBe('new-session')
  })

  it('finds a command by a prefix no other tmux command shares', () => {
    expect(found('split')).toBe('split-window')
    expect(found('select-p')).toBe('select-pane')
  })

  it('prefers an exact alias over a prefix shared by several commands', () => {
    // `new` is also a prefix of `new-window`.
    expect(found('new')).toBe('new-session')
  })

  it('reports an ambiguous prefix with every command it could mean, including unsupported ones', () => {
    expect(errorOf('select')).toEqual({
      code: 'parse.ambiguousCommand',
      params: { command: 'select', matches: 'select-layout, select-pane, select-window' },
    })
  })

  it('reports a real tmux command that is not in the table as unsupported', () => {
    expect(errorOf('clock-mode')).toEqual({ code: 'command.unsupported', params: { command: 'clock-mode' } })
  })

  it('reports an unsupported command reached through its alias or a unique prefix under its full name', () => {
    expect(errorOf('lsb')).toEqual({ code: 'command.unsupported', params: { command: 'list-buffers' } })
    expect(errorOf('clock')).toEqual({ code: 'command.unsupported', params: { command: 'clock-mode' } })
  })

  it('suggests the closest supported command for a typo', () => {
    expect(errorOf('splt-window')).toEqual({
      code: 'parse.unknownCommand',
      params: { command: 'splt-window' },
      suggestion: 'split-window',
    })
  })

  it('suggests from aliases too, naming the alias', () => {
    expect(errorOf('nwe').suggestion).toBe('new')
  })

  it('never suggests a command the simulator does not support', () => {
    expect(errorOf('clock-mod2').suggestion).toBeUndefined()
  })

  it('gives no suggestion when nothing is close', () => {
    expect(errorOf('frobnicate')).toEqual({ code: 'parse.unknownCommand', params: { command: 'frobnicate' } })
  })

  it('is case sensitive, like tmux', () => {
    expect(errorOf('Split-Window').code).toBe('parse.unknownCommand')
  })

  it('does not treat an inherited object key as a command', () => {
    expect(errorOf('constructor').code).toBe('parse.unknownCommand')
  })

  it('treats an empty name as unknown rather than as a prefix of everything', () => {
    expect(errorOf('')).toEqual({ code: 'parse.unknownCommand', params: { command: '' } })
  })
})
