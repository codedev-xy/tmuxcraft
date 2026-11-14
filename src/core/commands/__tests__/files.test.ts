import { describe, it, expect } from 'vitest'
import { executeLine } from '../../execute'
import type { ExecContext } from '../types'
import { MAX_FILE_DEPTH } from '../../script'
import { defaultState, emptyState } from '../../state'
import type { TmuxState } from '../../types'
import { errorOf, must, TYPED } from '../../__tests__/harness'
import { contentOf, deepFreeze, ENGINE, logNames, withFiles } from '../../__tests__/shell-engine'

const CONF = [
  '# my config',
  'set -g prefix C-a',
  '',
  'bind | split-window -h',
  'bind r \\',
  '  source-file ~/.tmux.conf',
].join('\n')

const run = (state: TmuxState, line: string, ctx: ExecContext = TYPED) => executeLine(state, line, ctx, ENGINE)
const configured = (files: Readonly<Record<string, string>>) => withFiles(defaultState(), files)

describe('source-file', () => {
  it('runs each line of the file as config, logging them before itself', () => {
    const result = must(run(configured({ '~/.tmux.conf': CONF }), 'source-file ~/.tmux.conf'))
    expect(result.state.options.prefix).toBe('C-a')
    expect(result.state.keyTables.prefix['|']).toBe('split-window -h')
    expect(result.state.keyTables.prefix.r).toBe('source-file ~/.tmux.conf')
    expect(result.state.log.map(entry => [entry.name, entry.origin])).toEqual([
      ['set-option', 'config'],
      ['bind-key', 'config'],
      ['bind-key', 'config'],
      ['source-file', 'typed'],
    ])
    expect(result.state.log.at(-1)?.detail).toEqual({ path: '~/.tmux.conf' })
  })

  it('is found by its alias and reads any spelling of the path', () => {
    const result = must(run(configured({ '~/.tmux.conf': 'set -g mouse on' }), 'source .tmux.conf'))
    expect(result.state.options.mouse).toBe('on')
  })

  it('carries on past a failing line and reports it with its line number', () => {
    const text = 'set -g mouse on\nbogus-command\n\nset -g prefix C-a\n'
    const result = run(configured({ '~/.tmux.conf': text }), 'source-file ~/.tmux.conf ; set-buffer after')
    expect(result.ok).toBe(false)
    expect(result.state.options).toMatchObject({ mouse: 'on', prefix: 'C-a' })
    expect(result.state.clipboard).toBe('')
    expect(logNames(result.state)).toEqual(['set-option', 'set-option', 'source-file'])
    expect(result.errors).toEqual([
      { code: 'parse.unknownCommand', params: { command: 'bogus-command' }, at: { path: '~/.tmux.conf', line: 2 } },
    ])
  })

  it('passes the output of its lines through', () => {
    const result = must(run({ ...configured({ '~/a.conf': 'show-buffer' }), clipboard: 'hi' }, 'source a.conf'))
    expect(result.output).toEqual(['hi'])
  })

  it('reports a missing file, or does nothing with -q', () => {
    const state = defaultState()
    expect(errorOf(run(state, 'source-file nope.conf'))).toEqual({ code: 'file.notFound', params: { path: '~/nope.conf' } })
    const quiet = must(run(state, 'source-file -q nope.conf'))
    expect(logNames(quiet.state)).toEqual(['source-file'])
  })

  it('needs a path and a server', () => {
    expect(errorOf(run(defaultState(), 'source-file'))).toEqual({ code: 'parse.tooFewArgs', params: { command: 'source-file' } })
    expect(errorOf(run(emptyState(), 'source-file x'))).toEqual({ code: 'session.none' })
  })

  it('sources nested files, keeping the inner line numbers', () => {
    const state = configured({ '~/a.conf': 'source b.conf\nset -g mouse on', '~/b.conf': '\nnope' })
    const result = run(state, 'source a.conf')
    expect(result.state.options.mouse).toBe('on')
    expect(result.errors).toEqual([{ code: 'parse.unknownCommand', params: { command: 'nope' }, at: { path: '~/b.conf', line: 2 } }])
  })

  it('refuses to go more than the maximum depth', () => {
    const state = configured({ '~/loop.conf': 'set-buffer -a x\nsource loop.conf' })
    const result = run(state, 'source loop.conf')
    expect(result.state.clipboard).toBe('x'.repeat(MAX_FILE_DEPTH))
    expect(result.errors).toEqual([{ code: 'script.depth', params: { path: '~/loop.conf' }, at: { path: '~/loop.conf', line: 2 } }])
  })

  it('runs lines one file deeper than the context it was given', () => {
    const state = configured({ '~/a.conf': 'set-buffer x' })
    const deep = run(state, 'source a.conf', { origin: 'config', depth: MAX_FILE_DEPTH - 1 })
    expect(deep.state.clipboard).toBe('x')
    expect(errorOf(run(state, 'source a.conf', { origin: 'config', depth: MAX_FILE_DEPTH }))).toEqual({
      code: 'script.depth',
      params: { path: '~/a.conf' },
    })
  })

  it('works from a shell, printing into the pane', () => {
    const state = { ...configured({ '~/a.conf': 'show-buffer' }), clipboard: 'hi' }
    const result = ENGINE.shell(state, 'p1', 'tmux source-file a.conf', TYPED)
    expect(contentOf(result.state, 'p1')).toEqual(['$ tmux source-file a.conf', 'hi'])
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(configured({ '~/.tmux.conf': CONF }))
    must(run(state, 'source ~/.tmux.conf'))
    expect(state.options).toEqual({})
    expect(state.log).toEqual([])
  })
})
