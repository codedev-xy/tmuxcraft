// ===== Core tmux Data Structures =====

export interface TmuxState {
  sessions: Session[]
  activeSessionId: string
  /** Top paste buffer. */
  clipboard: string
  isDetached: boolean
  /** Global options that were explicitly set; read through `getOption` to get defaults. */
  options: Readonly<Record<string, string>>
  keyTables: KeyTables
  copyMode: CopyModeState | null
  prompt: PromptState | null
  /** Virtual filesystem: normalized path (`~/.tmux.conf`) to file text. */
  files: Readonly<Record<string, string>>
  /** Append-only record of every command that ran, so validators can require that something happened. */
  log: readonly LogEntry[]
  /** Monotonic counter behind generated session / window / pane IDs; never reused after a kill. */
  nextId: number
  /** True after the prefix key, until the next key picks a binding from the prefix table. */
  prefixPending: boolean
  /** The terminal outside tmux: what the player sees and types into while detached. */
  outer: Pane
  /** Path of the file open in the editor (`vim ~/.tmux.conf`), null when the editor is closed. */
  editing: string | null
}

export interface Session {
  id: string
  name: string
  windows: Window[]
  activeWindowIndex: number
}

export interface Window {
  id: string
  name: string
  layoutTree: LayoutNode
  activePaneId: string
  synchronizePanes: boolean
  /** The active pane fills the window while true. */
  zoomed: boolean
  /** Index into the preset layout cycle of the last preset applied, -1 if none. */
  layoutIndex: number
}

// ===== Command Log =====

/** Where a command came from: typed line, key binding, mouse, sourced config file, or shell script. */
export type Origin = 'typed' | 'key' | 'mouse' | 'config' | 'script'

export interface LogEntry {
  readonly seq: number
  /** Canonical tmux command name (`split-window`), `shell` for a shell line that ran in a pane, or `save-file` for an editor save. */
  readonly name: string
  readonly origin: Origin
  /** The key that fired the binding when `origin` is `key`. */
  readonly key?: KeyId
  /** Normalized path of the config file or script whose line this was; absent for anything typed, pressed or clicked. */
  readonly file?: string
  readonly detail?: Readonly<Record<string, string>>
}

// ===== Keys =====

/** A key in tmux notation: `C-b`, `M-Left`, `%`, `Space`, `Enter`, `Up`. */
export type KeyId = string

/** Key to the command line it runs, exactly as `list-keys` would print it. */
export type KeyTable = Readonly<Record<KeyId, string>>

export interface KeyTables {
  /** Bindings that fire after the prefix key. */
  readonly prefix: KeyTable
  /** Bindings that fire without the prefix (`bind -n`). */
  readonly root: KeyTable
}

// ===== Command Prompt =====

/** An open status-line prompt; submitting runs `template` with `%%` replaced by the input. */
export interface PromptState {
  readonly label: string
  readonly initial: string
  readonly template: string
}

export interface Pane {
  id: string
  /** Scrollback lines, oldest first. */
  content: string[]
  /** Text sitting at the shell prompt that has not been run yet (typed by `send-keys` or pasted). */
  input: string
  cwd: string
}

export interface LayoutNode {
  type: 'pane' | 'split'
  direction?: 'horizontal' | 'vertical'
  ratio?: number
  pane?: Pane
  children?: [LayoutNode, LayoutNode]
}

export interface PaneLayout {
  paneId: string
  x: number
  y: number
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// ===== Layout Types =====

export type PresetLayout =
  | 'even-horizontal'
  | 'even-vertical'
  | 'main-horizontal'
  | 'main-vertical'
  | 'tiled'

// ===== Copy Mode =====

export interface Position {
  readonly row: number
  readonly col: number
}

export interface CopyModeState {
  readonly paneId: string
  /** Row is an index into the pane's `content`. */
  readonly cursor: Position
  /** Where the selection started; null while nothing is selected. */
  readonly anchor: Position | null
}

// ===== Direction =====

export type Direction = 'up' | 'down' | 'left' | 'right'
