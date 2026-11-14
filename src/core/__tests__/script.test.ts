import { describe, it, expect } from 'vitest'
import { fileLines, MAX_FILE_DEPTH, runScript } from '../script'
import type { ScriptLineRunner } from '../script'
import { runShellLine } from '../shell'
import type { ExecContext } from '../commands/types'
import { defaultState, emptyState } from '../state'
import type { TmuxState } from '../types'
import { appendLog } from '../update'
import { windowPanes } from '../selectors'
import { TYPED } from './harness'
import { contentOf, deepFreeze, ENGINE, logNames, withFiles } from './shell-engine'

const bash = (state: TmuxState, line: string, paneId = 'p1') => runShellLine(state, paneId, line, TYPED, ENGINE)

describe('fileLines', () => {
  it('skips blank lines, comments and the shebang, numbering lines from 1', () => {
    expect(fileLines('#!/bin/bash\n\n  # setup\necho a\n   \necho b')).toEqual([
      { text: 'echo a', line: 4 },
      { text: 'echo b', line: 6 },
    ])
  })

  it('joins a line ending in a backslash with the next, keeping the first line number', () => {
    expect(fileLines('echo a \\\n  b \\\n  c\necho d\r\n')).toEqual([
      { text: 'echo a   b   c', line: 1 },
      { text: 'echo d', line: 4 },
    ])
  })

  it('drops a backslash on the last line', () => {
    expect(fileLines('echo a \\')).toEqual([{ text: 'echo a ', line: 1 }])
  })
})

describe('runScript', () => {
  /** Records every line and context it was given. */
  const recorder: ScriptLineRunner = (state, paneId, line, ctx) => ({
    state: appendLog(state, { name: 'shell', origin: ctx.origin, detail: { pane: paneId, line, depth: String(ctx.depth) } }),
    ok: line !== 'fail',
    output: [],
    errors: line === 'fail' ? [{ code: 'shell.commandNotFound', params: { command: 'fail' } }] : [],
    exited: line === 'exit',
  })
  const state = withFiles(defaultState(), { '~/s.sh': 'one\nfail\n\ntwo\nexit\nthree\n' })

  it('runs each line in the pane one file deeper, as a script', () => {
    const result = runScript(state, 'p1', 's.sh', { origin: 'typed', depth: 1 }, recorder)
    expect(result.state.log.map(entry => entry.detail)).toEqual([
      { pane: 'p1', line: 'one', depth: '2' },
      { pane: 'p1', line: 'fail', depth: '2' },
      { pane: 'p1', line: 'two', depth: '2' },
      { pane: 'p1', line: 'exit', depth: '2' },
    ])
    expect(result.state.log.every(entry => entry.origin === 'script')).toBe(true)
  })

  it('carries on past failing lines and stops at exit', () => {
    const result = runScript(state, 'p1', '~/s.sh', TYPED, recorder)
    expect(result.ok).toBe(false)
    expect(result.output).toEqual([])
    expect(result.errors).toEqual([
      { code: 'shell.commandNotFound', params: { command: 'fail' }, at: { path: '~/s.sh', line: 2 } },
    ])
  })

  it('reports a missing file', () => {
    expect(runScript(state, 'p1', 'nope.sh', TYPED, recorder).errors).toEqual([
      { code: 'file.notFound', params: { path: '~/nope.sh' } },
    ])
  })

  it('refuses to go more than the maximum depth', () => {
    const ctx: ExecContext = { origin: 'script', depth: MAX_FILE_DEPTH }
    const result = runScript(state, 'p1', 's.sh', ctx, recorder)
    expect(result).toEqual({ state, ok: false, output: [], errors: [{ code: 'script.depth', params: { path: '~/s.sh' } }] })
  })
})

describe('bash / sh', () => {
  const DEV = [
    '#!/bin/bash',
    '# Build the dev session',
    'tmux new-session -d -s dev -n editor',
    'tmux new-window -t dev -n server',
    "tmux send-keys -t dev:server 'npm run dev' Enter",
    'tmux split-window -h -t dev:editor',
    'tmux select-window -t dev:editor',
    'tmux attach -t dev',
  ].join('\n')

  it('builds a session with windows and send-keys from outside tmux', () => {
    const result = bash(withFiles(emptyState(), { '~/dev.sh': DEV }), 'bash dev.sh', 'outer')
    expect(result.ok).toBe(true)
    const [dev] = result.state.sessions
    expect(dev.windows.map(window => window.name)).toEqual(['editor', 'server'])
    expect(windowPanes(dev.windows[0])).toHaveLength(2)
    const server = windowPanes(dev.windows[1])[0]
    expect(server.content).toEqual(['$ npm run dev'])
    expect(result.state).toMatchObject({ isDetached: false, activeSessionId: dev.id })
    expect(result.state.outer.content).toEqual(['$ bash dev.sh'])
  })

  it('does not echo script lines, but logs them as script shell lines before the bash line', () => {
    const result = bash(withFiles(defaultState(), { '~/a.sh': 'echo one\necho two\n' }), 'sh a.sh')
    expect(contentOf(result.state, 'p1')).toEqual(['$ sh a.sh', 'one', 'two'])
    expect(result.state.log.map(entry => [entry.name, entry.origin, entry.detail?.line])).toEqual([
      ['shell', 'script', 'echo one'],
      ['shell', 'script', 'echo two'],
      ['shell', 'typed', 'sh a.sh'],
    ])
  })

  it('reports every failing line with its file and line number', () => {
    const state = withFiles(defaultState(), { '~/a.sh': '#!/bin/sh\nnope\necho ok\ntmux kill-session -t ghost\n' })
    const result = bash(state, 'bash a.sh')
    expect(contentOf(result.state, 'p1')).toEqual(['$ bash a.sh', 'ok'])
    expect(result.errors).toEqual([
      { code: 'shell.commandNotFound', params: { command: 'nope' }, at: { path: '~/a.sh', line: 2 } },
      { code: 'target.sessionNotFound', params: { target: 'ghost' }, at: { path: '~/a.sh', line: 4 } },
    ])
  })

  it('runs a script that calls another script, keeping the inner line numbers', () => {
    const state = withFiles(defaultState(), {
      '~/outer.sh': 'echo start\nbash ~/inner.sh\necho end\n',
      '~/inner.sh': '\necho inner\nnope\n',
    })
    const result = bash(state, 'bash outer.sh')
    expect(contentOf(result.state, 'p1')).toEqual(['$ bash outer.sh', 'start', 'inner', 'end'])
    expect(result.errors).toEqual([
      { code: 'shell.commandNotFound', params: { command: 'nope' }, at: { path: '~/inner.sh', line: 3 } },
    ])
  })

  it('stops a script that calls itself after the maximum depth', () => {
    const state = withFiles(defaultState(), { '~/loop.sh': 'echo deeper\nbash loop.sh\n' })
    const result = bash(state, 'bash loop.sh')
    expect(contentOf(result.state, 'p1').filter(line => line === 'deeper')).toHaveLength(MAX_FILE_DEPTH)
    expect(result.errors).toEqual([{ code: 'script.depth', params: { path: '~/loop.sh' }, at: { path: '~/loop.sh', line: 2 } }])
  })

  it('stops the script at exit without closing the pane', () => {
    const state = withFiles(defaultState(), { '~/a.sh': 'echo a\nexit\necho b\n' })
    const result = bash(state, 'bash a.sh ; echo after')
    expect(contentOf(result.state, 'p1')).toEqual(['$ bash a.sh ; echo after', 'a', 'after'])
  })

  it('reports a missing script and a missing operand', () => {
    expect(bash(defaultState(), 'bash nope.sh').errors).toEqual([{ code: 'file.notFound', params: { path: '~/nope.sh' } }])
    expect(bash(defaultState(), 'sh').errors).toEqual([{ code: 'shell.missingOperand', params: { command: 'sh' } }])
  })

  it('does not change the state it was given', () => {
    const state = deepFreeze(withFiles(emptyState(), { '~/dev.sh': DEV }))
    bash(state, 'bash dev.sh', 'outer')
    expect(state.sessions).toEqual([])
    expect(logNames(state)).toEqual([])
  })
})
