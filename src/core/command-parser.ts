import type { ParsedCommand, ParseError, ParseResult, CommandType } from './types'

type KeyEntry = { type: CommandType; args: Record<string, string | number | boolean> }

const KEY_MAP: Record<string, KeyEntry> = {
  '"': { type: 'split-horizontal', args: {} },
  '%': { type: 'split-vertical', args: {} },
  'c': { type: 'new-window', args: {} },
  'n': { type: 'next-window', args: {} },
  'p': { type: 'previous-window', args: {} },
  'x': { type: 'close-pane', args: {} },
  'z': { type: 'zoom-pane', args: {} },
  'd': { type: 'detach', args: {} },
  ',': { type: 'rename-window', args: {} },
  '{': { type: 'swap-pane', args: { direction: 'up' } },
  '}': { type: 'swap-pane', args: { direction: 'down' } },
  '!': { type: 'break-pane', args: {} },
  ' ': { type: 'next-layout', args: {} },
  'Space': { type: 'next-layout', args: {} },
  '[': { type: 'enter-copy-mode', args: {} },
  ']': { type: 'paste', args: {} },
  's': { type: 'list-sessions', args: {} },
  'ArrowUp': { type: 'select-pane', args: { direction: 'up' } },
  'ArrowDown': { type: 'select-pane', args: { direction: 'down' } },
  'ArrowLeft': { type: 'select-pane', args: { direction: 'left' } },
  'ArrowRight': { type: 'select-pane', args: { direction: 'right' } },
  '0': { type: 'select-window', args: { index: 0 } },
  '1': { type: 'select-window', args: { index: 1 } },
  '2': { type: 'select-window', args: { index: 2 } },
  '3': { type: 'select-window', args: { index: 3 } },
  '4': { type: 'select-window', args: { index: 4 } },
  '5': { type: 'select-window', args: { index: 5 } },
  '6': { type: 'select-window', args: { index: 6 } },
  '7': { type: 'select-window', args: { index: 7 } },
  '8': { type: 'select-window', args: { index: 8 } },
  '9': { type: 'select-window', args: { index: 9 } },
}

const CTRL_ARROW_MAP: Record<string, KeyEntry> = {
  'C-ArrowUp': { type: 'resize-pane', args: { direction: 'up', amount: 5 } },
  'C-ArrowDown': { type: 'resize-pane', args: { direction: 'down', amount: 5 } },
  'C-ArrowLeft': { type: 'resize-pane', args: { direction: 'left', amount: 5 } },
  'C-ArrowRight': { type: 'resize-pane', args: { direction: 'right', amount: 5 } },
}

export class CommandParser {
  parseInput(input: string): ParseResult {
    const trimmed = input.trim()
    if (!trimmed) return this.makeError('Empty command', input)

    if (trimmed === 'exit') return this.makeCommand('exit', {}, input)
    if (trimmed.startsWith('tmux')) return this.parseTmuxCommand(trimmed)
    if (trimmed.startsWith(':')) return this.parseColonCommand(trimmed)

    return this.makeError(`Unknown command: ${trimmed}`, input, this.findSuggestion(trimmed))
  }

  parseKeySequence(_prefix: string, key: string): ParseResult {
    const ctrlEntry = CTRL_ARROW_MAP[key]
    if (ctrlEntry) {
      return this.makeCommand(ctrlEntry.type, ctrlEntry.args, `prefix + ${key}`)
    }

    const entry = KEY_MAP[key]
    if (entry) {
      return this.makeCommand(entry.type, entry.args, `prefix + ${key}`)
    }

    return this.makeError(`Unknown key binding: ${key}`, `prefix + ${key}`)
  }

  private parseTmuxCommand(input: string): ParseResult {
    const parts = this.tokenize(input)
    parts.shift() // remove 'tmux'

    if (parts.length === 0) {
      return this.makeCommand('new-session', {}, input)
    }

    const subcommand = parts[0]
    const args = parts.slice(1)

    switch (subcommand) {
      case 'new':
      case 'new-session': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-s' && args[i + 1]) { parsed.name = args[++i] }
          else if (args[i] === '-n' && args[i + 1]) { parsed.windowName = args[++i] }
        }
        return this.makeCommand('new-session', parsed, input)
      }
      case 'attach':
      case 'attach-session':
      case 'a': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) { parsed.target = args[++i] }
        }
        return this.makeCommand('attach', parsed, input)
      }
      case 'ls':
      case 'list-sessions':
        return this.makeCommand('list-sessions', {}, input)
      case 'kill-session': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) { parsed.target = args[++i] }
        }
        if (!parsed.target) return this.makeError('kill-session requires -t target', input)
        return this.makeCommand('kill-session', parsed, input)
      }
      case 'switch-client':
      case 'switch': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) { parsed.target = args[++i] }
        }
        return this.makeCommand('switch-session', parsed, input)
      }
      case 'detach':
      case 'detach-client':
        return this.makeCommand('detach', {}, input)
      case 'send-keys': {
        const keys = args.join(' ')
        return this.makeCommand('send-keys', { keys }, input)
      }
      case 'source-file':
      case 'source': {
        if (args.length === 0) return this.makeError('source-file requires a file path', input)
        return this.makeCommand('source-file', { file: args[0] }, input)
      }
      default:
        return this.makeError(`Unknown tmux subcommand: ${subcommand}`, input, this.findTmuxSuggestion(subcommand))
    }
  }

  private parseColonCommand(input: string): ParseResult {
    const content = input.slice(1).trim()
    const parts = this.tokenize(content)
    if (parts.length === 0) return this.makeError('Empty command', input)

    const cmd = parts[0]
    const args = parts.slice(1)

    switch (cmd) {
      case 'split-window':
      case 'splitw': {
        let direction: 'horizontal' | 'vertical' = 'horizontal'
        for (const arg of args) {
          if (arg === '-h') direction = 'vertical'
          if (arg === '-v') direction = 'horizontal'
        }
        return this.makeCommand(direction === 'horizontal' ? 'split-horizontal' : 'split-vertical', {}, input)
      }
      case 'select-pane':
      case 'selectp': {
        const parsed: Record<string, string | number | boolean> = {}
        for (const arg of args) {
          if (arg === '-L') parsed.direction = 'left'
          if (arg === '-R') parsed.direction = 'right'
          if (arg === '-U') parsed.direction = 'up'
          if (arg === '-D') parsed.direction = 'down'
        }
        return this.makeCommand('select-pane', parsed, input)
      }
      case 'resize-pane':
      case 'resizep': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-L') { parsed.direction = 'left'; if (args[i + 1] && !args[i + 1].startsWith('-')) parsed.amount = parseInt(args[++i]) || 5 }
          else if (args[i] === '-R') { parsed.direction = 'right'; if (args[i + 1] && !args[i + 1].startsWith('-')) parsed.amount = parseInt(args[++i]) || 5 }
          else if (args[i] === '-U') { parsed.direction = 'up'; if (args[i + 1] && !args[i + 1].startsWith('-')) parsed.amount = parseInt(args[++i]) || 5 }
          else if (args[i] === '-D') { parsed.direction = 'down'; if (args[i + 1] && !args[i + 1].startsWith('-')) parsed.amount = parseInt(args[++i]) || 5 }
          else if (args[i] === '-Z') return this.makeCommand('zoom-pane', {}, input)
        }
        if (!parsed.direction) parsed.direction = 'right'
        if (!parsed.amount) parsed.amount = 5
        return this.makeCommand('resize-pane', parsed, input)
      }
      case 'swap-pane':
      case 'swapp': {
        const parsed: Record<string, string | number | boolean> = {}
        for (const arg of args) {
          if (arg === '-U') parsed.direction = 'up'
          if (arg === '-D') parsed.direction = 'down'
        }
        return this.makeCommand('swap-pane', parsed, input)
      }
      case 'join-pane':
      case 'joinp': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-s' && args[i + 1]) parsed.source = args[++i]
          if (args[i] === '-t' && args[i + 1]) parsed.target = args[++i]
          if (args[i] === '-h') parsed.horizontal = true
        }
        return this.makeCommand('join-pane', parsed, input)
      }
      case 'break-pane':
      case 'breakp':
        return this.makeCommand('break-pane', {}, input)
      case 'new-window':
      case 'neww': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-n' && args[i + 1]) parsed.name = args[++i]
        }
        return this.makeCommand('new-window', parsed, input)
      }
      case 'select-window':
      case 'selectw': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) parsed.index = parseInt(args[++i]) || 0
        }
        return this.makeCommand('select-window', parsed, input)
      }
      case 'rename-window':
      case 'renamew': {
        if (args.length === 0) return this.makeError('rename-window requires a name', input)
        return this.makeCommand('rename-window', { name: args[0] }, input)
      }
      case 'move-window':
      case 'movew': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) parsed.target = args[++i]
          if (args[i] === '-s' && args[i + 1]) parsed.source = args[++i]
        }
        return this.makeCommand('move-window', parsed, input)
      }
      case 'swap-window':
      case 'swapw': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-t' && args[i + 1]) parsed.target = args[++i]
          if (args[i] === '-s' && args[i + 1]) parsed.source = args[++i]
        }
        return this.makeCommand('swap-window', parsed, input)
      }
      case 'link-window':
      case 'linkw': {
        const parsed: Record<string, string | number | boolean> = {}
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '-s' && args[i + 1]) parsed.source = args[++i]
          if (args[i] === '-t' && args[i + 1]) parsed.target = args[++i]
        }
        return this.makeCommand('link-window', parsed, input)
      }
      case 'set':
      case 'set-option': {
        const parsed: Record<string, string | number | boolean> = {}
        let i = 0
        while (i < args.length && args[i].startsWith('-')) {
          if (args[i] === '-g') parsed.global = true
          i++
        }
        if (i < args.length) parsed.option = args[i++]
        if (i < args.length) parsed.value = args[i]
        return this.makeCommand('set-option', parsed, input)
      }
      case 'setw':
      case 'set-window-option': {
        const parsed: Record<string, string | number | boolean> = {}
        let i = 0
        while (i < args.length && args[i].startsWith('-')) {
          if (args[i] === '-g') parsed.global = true
          i++
        }
        if (i < args.length) parsed.option = args[i++]
        if (i < args.length) parsed.value = args[i]
        if (parsed.option === 'synchronize-panes') {
          return this.makeCommand('synchronize-panes', { value: parsed.value === 'on' || parsed.value === 'true' }, input)
        }
        return this.makeCommand('set-window-option', parsed, input)
      }
      case 'bind-key':
      case 'bind': {
        if (args.length < 2) return this.makeError('bind-key requires key and command', input)
        const key = args[0]
        const command = args.slice(1).join(' ')
        return this.makeCommand('bind-key', { key, command }, input)
      }
      case 'unbind-key':
      case 'unbind': {
        if (args.length === 0) return this.makeError('unbind-key requires a key', input)
        return this.makeCommand('unbind-key', { key: args[0] }, input)
      }
      case 'source-file':
      case 'source': {
        if (args.length === 0) return this.makeError('source-file requires a file path', input)
        return this.makeCommand('source-file', { file: args[0] }, input)
      }
      case 'send-keys': {
        return this.makeCommand('send-keys', { keys: args.join(' ') }, input)
      }
      case 'next-layout':
      case 'next':
        return this.makeCommand('next-layout', {}, input)
      case 'select-layout': {
        if (args.length === 0) return this.makeError('select-layout requires a layout name', input)
        return this.makeCommand('select-layout', { layout: args[0] }, input)
      }
      case 'list-windows':
      case 'lsw':
        return this.makeCommand('list-windows', {}, input)
      case 'list-panes':
      case 'lsp':
        return this.makeCommand('list-panes', {}, input)
      default:
        return this.makeError(`Unknown command: ${cmd}`, input, this.findColonSuggestion(cmd))
    }
  }

  private makeCommand(type: CommandType, args: Record<string, string | number | boolean>, raw: string): ParsedCommand {
    return { type, args, raw }
  }

  private makeError(message: string, raw: string, suggestion?: string): ParseError {
    return { error: true, message, raw, suggestion }
  }

  private tokenize(input: string): string[] {
    const tokens: string[] = []
    let current = ''
    let inQuote = false
    let quoteChar = ''
    for (const ch of input) {
      if (inQuote) {
        if (ch === quoteChar) { inQuote = false }
        else { current += ch }
      } else if (ch === '"' || ch === "'") {
        inQuote = true
        quoteChar = ch
      } else if (ch === ' ' || ch === '\t') {
        if (current) { tokens.push(current); current = '' }
      } else {
        current += ch
      }
    }
    if (current) tokens.push(current)
    return tokens
  }

  private findSuggestion(input: string): string | undefined {
    const commands = ['tmux', 'exit']
    return this.closestMatch(input, commands)
  }

  private findTmuxSuggestion(sub: string): string | undefined {
    const subs = ['new', 'new-session', 'attach', 'attach-session', 'ls', 'list-sessions', 'kill-session', 'switch-client', 'detach', 'send-keys', 'source-file']
    return this.closestMatch(sub, subs)
  }

  private findColonSuggestion(cmd: string): string | undefined {
    const cmds = ['split-window', 'select-pane', 'resize-pane', 'swap-pane', 'join-pane', 'break-pane', 'new-window', 'select-window', 'rename-window', 'move-window', 'swap-window', 'set', 'setw', 'bind-key', 'unbind-key', 'source-file', 'send-keys']
    return this.closestMatch(cmd, cmds)
  }

  private closestMatch(input: string, options: string[]): string | undefined {
    let best: string | undefined
    let bestDist = Infinity
    for (const opt of options) {
      const dist = this.levenshtein(input.toLowerCase(), opt.toLowerCase())
      if (dist < bestDist && dist <= 3) {
        bestDist = dist
        best = opt
      }
    }
    return best
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        )
      }
    }
    return dp[m][n]
  }
}
