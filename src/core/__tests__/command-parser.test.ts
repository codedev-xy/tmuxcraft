import { describe, it, expect } from 'vitest'
import { CommandParser } from '../command-parser'
import { isParseError } from '../types'
import type { ParsedCommand } from '../types'

const parser = new CommandParser()

function expectCommand(result: ReturnType<CommandParser['parseInput']>, type: string) {
  expect(isParseError(result)).toBe(false)
  expect((result as ParsedCommand).type).toBe(type)
  return result as ParsedCommand
}

function expectError(result: ReturnType<CommandParser['parseInput']>) {
  expect(isParseError(result)).toBe(true)
}

describe('CommandParser - parseInput', () => {
  describe('empty and exit', () => {
    it('returns error for empty input', () => {
      expectError(parser.parseInput(''))
      expectError(parser.parseInput('   '))
    })

    it('parses exit command', () => {
      expectCommand(parser.parseInput('exit'), 'exit')
    })
  })

  describe('tmux commands', () => {
    it('parses bare tmux as new-session', () => {
      expectCommand(parser.parseInput('tmux'), 'new-session')
    })

    it('parses tmux new -s name', () => {
      const cmd = expectCommand(parser.parseInput('tmux new -s mysession'), 'new-session')
      expect(cmd.args.name).toBe('mysession')
    })

    it('parses tmux new-session -s name', () => {
      const cmd = expectCommand(parser.parseInput('tmux new-session -s work'), 'new-session')
      expect(cmd.args.name).toBe('work')
    })

    it('parses tmux attach -t name', () => {
      const cmd = expectCommand(parser.parseInput('tmux attach -t mysession'), 'attach')
      expect(cmd.args.target).toBe('mysession')
    })

    it('parses tmux a -t name (short form)', () => {
      const cmd = expectCommand(parser.parseInput('tmux a -t work'), 'attach')
      expect(cmd.args.target).toBe('work')
    })

    it('parses tmux ls', () => {
      expectCommand(parser.parseInput('tmux ls'), 'list-sessions')
    })

    it('parses tmux list-sessions', () => {
      expectCommand(parser.parseInput('tmux list-sessions'), 'list-sessions')
    })

    it('parses tmux kill-session -t name', () => {
      const cmd = expectCommand(parser.parseInput('tmux kill-session -t old'), 'kill-session')
      expect(cmd.args.target).toBe('old')
    })

    it('returns error for kill-session without target', () => {
      expectError(parser.parseInput('tmux kill-session'))
    })

    it('parses tmux switch-client -t name', () => {
      const cmd = expectCommand(parser.parseInput('tmux switch-client -t dev'), 'switch-session')
      expect(cmd.args.target).toBe('dev')
    })

    it('parses tmux detach', () => {
      expectCommand(parser.parseInput('tmux detach'), 'detach')
    })

    it('parses tmux source-file', () => {
      const cmd = expectCommand(parser.parseInput('tmux source-file ~/.tmux.conf'), 'source-file')
      expect(cmd.args.file).toBe('~/.tmux.conf')
    })

    it('returns error for source-file without path', () => {
      expectError(parser.parseInput('tmux source-file'))
    })

    it('parses tmux send-keys', () => {
      const cmd = expectCommand(parser.parseInput('tmux send-keys ls -la Enter'), 'send-keys')
      expect(cmd.args.keys).toBe('ls -la Enter')
    })

    it('returns error for unknown tmux subcommand', () => {
      expectError(parser.parseInput('tmux foobar'))
    })

    it('returns error with suggestion for typos', () => {
      const result = parser.parseInput('tmux atach')
      expect(isParseError(result)).toBe(true)
      if (isParseError(result)) {
        expect(result.suggestion).toBeDefined()
      }
    })
  })

  describe('colon commands', () => {
    it('parses :split-window as horizontal split', () => {
      expectCommand(parser.parseInput(':split-window'), 'split-horizontal')
    })

    it('parses :split-window -h as vertical split', () => {
      expectCommand(parser.parseInput(':split-window -h'), 'split-vertical')
    })

    it('parses :splitw shorthand', () => {
      expectCommand(parser.parseInput(':splitw'), 'split-horizontal')
    })

    it('parses :select-pane with directions', () => {
      expect((expectCommand(parser.parseInput(':select-pane -L'), 'select-pane')).args.direction).toBe('left')
      expect((expectCommand(parser.parseInput(':select-pane -R'), 'select-pane')).args.direction).toBe('right')
      expect((expectCommand(parser.parseInput(':select-pane -U'), 'select-pane')).args.direction).toBe('up')
      expect((expectCommand(parser.parseInput(':select-pane -D'), 'select-pane')).args.direction).toBe('down')
    })

    it('parses :resize-pane with direction and amount', () => {
      const cmd = expectCommand(parser.parseInput(':resize-pane -R 10'), 'resize-pane')
      expect(cmd.args.direction).toBe('right')
      expect(cmd.args.amount).toBe(10)
    })

    it('parses :resize-pane -Z as zoom-pane', () => {
      expectCommand(parser.parseInput(':resize-pane -Z'), 'zoom-pane')
    })

    it('parses :swap-pane with direction', () => {
      const cmd = expectCommand(parser.parseInput(':swap-pane -U'), 'swap-pane')
      expect(cmd.args.direction).toBe('up')
    })

    it('parses :join-pane -s source', () => {
      const cmd = expectCommand(parser.parseInput(':join-pane -s 1'), 'join-pane')
      expect(cmd.args.source).toBe('1')
    })

    it('parses :break-pane', () => {
      expectCommand(parser.parseInput(':break-pane'), 'break-pane')
    })

    it('parses :new-window -n name', () => {
      const cmd = expectCommand(parser.parseInput(':new-window -n editor'), 'new-window')
      expect(cmd.args.name).toBe('editor')
    })

    it('parses :rename-window name', () => {
      const cmd = expectCommand(parser.parseInput(':rename-window logs'), 'rename-window')
      expect(cmd.args.name).toBe('logs')
    })

    it('returns error for rename-window without name', () => {
      expectError(parser.parseInput(':rename-window'))
    })

    it('parses :select-window -t index', () => {
      const cmd = expectCommand(parser.parseInput(':select-window -t 2'), 'select-window')
      expect(cmd.args.index).toBe(2)
    })

    it('parses :set -g option value', () => {
      const cmd = expectCommand(parser.parseInput(':set -g prefix C-a'), 'set-option')
      expect(cmd.args.global).toBe(true)
      expect(cmd.args.option).toBe('prefix')
      expect(cmd.args.value).toBe('C-a')
    })

    it('parses :setw synchronize-panes on', () => {
      const cmd = expectCommand(parser.parseInput(':setw synchronize-panes on'), 'synchronize-panes')
      expect(cmd.args.value).toBe(true)
    })

    it('parses :setw synchronize-panes off', () => {
      const cmd = expectCommand(parser.parseInput(':setw synchronize-panes off'), 'synchronize-panes')
      expect(cmd.args.value).toBe(false)
    })

    it('parses :bind-key', () => {
      const cmd = expectCommand(parser.parseInput(':bind-key h split-window -h'), 'bind-key')
      expect(cmd.args.key).toBe('h')
      expect(cmd.args.command).toBe('split-window -h')
    })

    it('returns error for bind-key without enough args', () => {
      expectError(parser.parseInput(':bind-key'))
    })

    it('parses :unbind-key', () => {
      const cmd = expectCommand(parser.parseInput(':unbind-key h'), 'unbind-key')
      expect(cmd.args.key).toBe('h')
    })

    it('parses :select-layout', () => {
      const cmd = expectCommand(parser.parseInput(':select-layout even-horizontal'), 'select-layout')
      expect(cmd.args.layout).toBe('even-horizontal')
    })

    it('parses :move-window', () => {
      const cmd = expectCommand(parser.parseInput(':move-window -t other'), 'move-window')
      expect(cmd.args.target).toBe('other')
    })

    it('parses :list-windows', () => {
      expectCommand(parser.parseInput(':list-windows'), 'list-windows')
    })

    it('parses :list-panes', () => {
      expectCommand(parser.parseInput(':list-panes'), 'list-panes')
    })

    it('returns error for unknown colon command', () => {
      expectError(parser.parseInput(':foobar'))
    })

    it('returns error for empty colon command', () => {
      expectError(parser.parseInput(':'))
    })
  })

  describe('unknown commands', () => {
    it('returns error for random text', () => {
      expectError(parser.parseInput('hello world'))
    })

    it('provides suggestion for close matches', () => {
      const result = parser.parseInput('exi')
      expect(isParseError(result)).toBe(true)
      if (isParseError(result)) {
        expect(result.suggestion).toBe('exit')
      }
    })
  })

  describe('tokenizer handles quoted strings', () => {
    it('handles double-quoted session name', () => {
      const cmd = expectCommand(parser.parseInput('tmux new -s "my session"'), 'new-session')
      expect(cmd.args.name).toBe('my session')
    })

    it('handles single-quoted session name', () => {
      const cmd = expectCommand(parser.parseInput("tmux new -s 'my session'"), 'new-session')
      expect(cmd.args.name).toBe('my session')
    })
  })
})

describe('CommandParser - parseKeySequence', () => {
  it('parses " as horizontal split', () => {
    const result = parser.parseKeySequence('C-b', '"')
    expectCommand(result as any, 'split-horizontal')
  })

  it('parses % as vertical split', () => {
    const result = parser.parseKeySequence('C-b', '%')
    expectCommand(result as any, 'split-vertical')
  })

  it('parses c as new-window', () => {
    const result = parser.parseKeySequence('C-b', 'c')
    expectCommand(result as any, 'new-window')
  })

  it('parses n as next-window', () => {
    const result = parser.parseKeySequence('C-b', 'n')
    expectCommand(result as any, 'next-window')
  })

  it('parses p as previous-window', () => {
    const result = parser.parseKeySequence('C-b', 'p')
    expectCommand(result as any, 'previous-window')
  })

  it('parses x as close-pane', () => {
    const result = parser.parseKeySequence('C-b', 'x')
    expectCommand(result as any, 'close-pane')
  })

  it('parses z as zoom-pane', () => {
    const result = parser.parseKeySequence('C-b', 'z')
    expectCommand(result as any, 'zoom-pane')
  })

  it('parses d as detach', () => {
    const result = parser.parseKeySequence('C-b', 'd')
    expectCommand(result as any, 'detach')
  })

  it('parses arrow keys as select-pane', () => {
    const up = parser.parseKeySequence('C-b', 'ArrowUp') as ParsedCommand
    expect(up.type).toBe('select-pane')
    expect(up.args.direction).toBe('up')

    const right = parser.parseKeySequence('C-b', 'ArrowRight') as ParsedCommand
    expect(right.args.direction).toBe('right')
  })

  it('parses number keys as select-window', () => {
    for (let i = 0; i <= 9; i++) {
      const result = parser.parseKeySequence('C-b', String(i)) as ParsedCommand
      expect(result.type).toBe('select-window')
      expect(result.args.index).toBe(i)
    }
  })

  it('parses Ctrl+Arrow as resize-pane', () => {
    const result = parser.parseKeySequence('C-b', 'C-ArrowRight') as ParsedCommand
    expect(result.type).toBe('resize-pane')
    expect(result.args.direction).toBe('right')
    expect(result.args.amount).toBe(5)
  })

  it('parses { and } as swap-pane', () => {
    const up = parser.parseKeySequence('C-b', '{') as ParsedCommand
    expect(up.type).toBe('swap-pane')
    expect(up.args.direction).toBe('up')

    const down = parser.parseKeySequence('C-b', '}') as ParsedCommand
    expect(down.args.direction).toBe('down')
  })

  it('parses ! as break-pane', () => {
    expectCommand(parser.parseKeySequence('C-b', '!') as any, 'break-pane')
  })

  it('parses Space as next-layout', () => {
    expectCommand(parser.parseKeySequence('C-b', ' ') as any, 'next-layout')
    expectCommand(parser.parseKeySequence('C-b', 'Space') as any, 'next-layout')
  })

  it('parses [ as enter-copy-mode', () => {
    expectCommand(parser.parseKeySequence('C-b', '[') as any, 'enter-copy-mode')
  })

  it('parses ] as paste', () => {
    expectCommand(parser.parseKeySequence('C-b', ']') as any, 'paste')
  })

  it('returns error for unknown key', () => {
    const result = parser.parseKeySequence('C-b', 'q')
    expect(isParseError(result)).toBe(true)
  })
})
