import { describe, it, expect } from 'vitest'
import { normalizePath, readFile, saveFile } from '../files'
import { emptyState } from '../state'

describe('normalizePath', () => {
  it.each([
    ['~/.tmux.conf', '~/.tmux.conf'],
    ['.tmux.conf', '~/.tmux.conf'],
    ['./dev.sh', '~/dev.sh'],
    ['$HOME/dev.sh', '~/dev.sh'],
    ['${HOME}/dev.sh', '~/dev.sh'],
    ['~//scripts/./dev.sh', '~/scripts/dev.sh'],
    ['~', '~'],
    ['/etc/tmux.conf', '/etc/tmux.conf'],
  ])('reads %s as %s', (input, expected) => {
    expect(normalizePath(input)).toBe(expected)
  })
})

describe('saveFile / readFile', () => {
  it('reads back what was saved, under any spelling of the path', () => {
    const state = saveFile(emptyState(), './dev.sh', 'tmux new -d -s dev\n')
    expect(readFile(state, '~/dev.sh')).toEqual({ ok: true, value: 'tmux new -d -s dev\n' })
    expect(readFile(state, '$HOME/dev.sh')).toEqual({ ok: true, value: 'tmux new -d -s dev\n' })
  })

  it('logs each save with the normalized path', () => {
    const once = saveFile(emptyState(), 'dev.sh', 'a')
    const twice = saveFile(once, '~/dev.sh', 'b')
    expect(twice.log).toEqual([
      { seq: 1, name: 'save-file', origin: 'typed', detail: { path: '~/dev.sh' } },
      { seq: 2, name: 'save-file', origin: 'typed', detail: { path: '~/dev.sh' } },
    ])
    expect(readFile(twice, 'dev.sh')).toEqual({ ok: true, value: 'b' })
  })

  it('does not change the state it was given', () => {
    const state = emptyState()
    saveFile(state, 'dev.sh', 'a')
    expect(state.files).toEqual({})
    expect(state.log).toEqual([])
  })

  it('reports a missing file with its normalized path', () => {
    expect(readFile(emptyState(), 'nope.conf')).toEqual({
      ok: false,
      error: { code: 'file.notFound', params: { path: '~/nope.conf' } },
    })
  })

  it('does not treat object built-ins as files', () => {
    expect(readFile(emptyState(), 'constructor').ok).toBe(false)
  })
})
