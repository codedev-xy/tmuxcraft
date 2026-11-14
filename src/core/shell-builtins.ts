import type { TmuxState } from './types'
import type { TmuxError } from './errors'
import { HOME } from './state'
import { openEditor, readFile } from './files'
import { appendPaneLines, updatePane } from './update'

/** What one shell command did to the state. */
export interface ShellStep {
  readonly state: TmuxState
  readonly errors: readonly TmuxError[]
  /** True after `exit`: the rest of the line, or of the script, does not run. */
  readonly exited: boolean
}

export type Builtin = (state: TmuxState, paneId: string, args: readonly string[], name: string) => ShellStep

/** Programs a player may reasonably type; they run without printing anything. */
const PROGRAMS: ReadonlySet<string> = new Set([
  'npm', 'npx', 'node', 'yarn', 'pnpm', 'python', 'python3', 'git', 'make', 'htop', 'top', 'tail', 'less',
  'man', 'ssh', 'ping', 'watch', 'docker', 'cargo', 'go',
])

export function step(state: TmuxState, errors: readonly TmuxError[] = []): ShellStep {
  return { state, errors, exited: false }
}

export function missingOperand(state: TmuxState, command: string): ShellStep {
  return step(state, [{ code: 'shell.missingOperand', params: { command } }])
}

function fileText(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  return text.endsWith('\n') ? lines.slice(0, -1) : lines
}

/** Names directly in the home directory: its files, and the first directory of nested ones. */
function homeEntries(state: TmuxState, all: boolean): string[] {
  const prefix = `${HOME}/`
  const names = Object.keys(state.files)
    .filter(path => path.startsWith(prefix))
    .map(path => path.slice(prefix.length).split('/')[0])
  return [...new Set(names)].filter(name => all || !name.startsWith('.')).sort()
}

const ls: Builtin = (state, paneId, args) => {
  const all = args.some(arg => arg.startsWith('-') && /[aA]/.test(arg))
  const entries = homeEntries(state, all)
  return step(entries.length === 0 ? state : appendPaneLines(state, paneId, [entries.join('  ')]))
}

const cat: Builtin = (state, paneId, args, name) => {
  if (args.length === 0) return missingOperand(state, name)
  return args.reduce<ShellStep>((current, path) => {
    const text = readFile(current.state, path)
    if (!text.ok) return step(current.state, [...current.errors, text.error])
    return step(appendPaneLines(current.state, paneId, fileText(text.value)), current.errors)
  }, step(state))
}

const editor: Builtin = (state, _paneId, args, name) =>
  args.length === 0 ? missingOperand(state, name) : step(openEditor(state, args[0]))

const BUILTINS: Readonly<Record<string, Builtin>> = {
  echo: (state, paneId, args) => step(appendPaneLines(state, paneId, [args.join(' ')])),
  clear: (state, paneId) => step(updatePane(state, paneId, pane => ({ ...pane, content: [] }))),
  pwd: (state, paneId) => step(appendPaneLines(state, paneId, [HOME])),
  ls,
  cat,
  vim: editor,
  vi: editor,
  nano: editor,
}

export const BUILTIN_NAMES: readonly string[] = Object.keys(BUILTINS)

/** A builtin that needs nothing but the state, or a silent stand-in for a known program; null otherwise. */
export function findBuiltin(name: string): Builtin | null {
  if (Object.hasOwn(BUILTINS, name)) return BUILTINS[name]
  return PROGRAMS.has(name) ? state => step(state) : null
}
