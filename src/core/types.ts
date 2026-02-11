// ===== Core tmux Data Structures =====

export interface TmuxState {
  sessions: Session[]
  activeSessionId: string
  clipboard: string
  isDetached: boolean
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
}

export interface Pane {
  id: string
  content: string[]
  cursorPosition: { row: number; col: number }
  isZoomed: boolean
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

// ===== Command Types =====

export type CommandType =
  // Session commands
  | 'new-session'
  | 'kill-session'
  | 'switch-session'
  | 'list-sessions'
  | 'rename-session'
  | 'detach'
  | 'attach'
  // Window commands
  | 'new-window'
  | 'close-window'
  | 'next-window'
  | 'previous-window'
  | 'select-window'
  | 'rename-window'
  | 'move-window'
  | 'swap-window'
  | 'link-window'
  // Pane commands
  | 'split-horizontal'
  | 'split-vertical'
  | 'close-pane'
  | 'select-pane'
  | 'resize-pane'
  | 'zoom-pane'
  | 'swap-pane'
  | 'break-pane'
  | 'join-pane'
  // Layout commands
  | 'next-layout'
  | 'select-layout'
  // Copy mode commands
  | 'enter-copy-mode'
  | 'paste'
  | 'copy-selection'
  // Config commands
  | 'set-option'
  | 'set-window-option'
  | 'bind-key'
  | 'unbind-key'
  | 'source-file'
  | 'send-keys'
  // Other
  | 'exit'
  | 'synchronize-panes'
  | 'list-windows'
  | 'list-panes'

export interface ParsedCommand {
  type: CommandType
  args: Record<string, string | number | boolean>
  raw: string
}

export interface ParseError {
  error: true
  message: string
  suggestion?: string
  raw: string
}

export type ParseResult = ParsedCommand | ParseError

export function isParseError(result: ParseResult): result is ParseError {
  return 'error' in result && result.error === true
}

// ===== Key Binding Types =====

export interface KeyAction {
  command: CommandType
  args?: Record<string, string | number | boolean>
  display: string
}

export type KeyBindingMap = Record<string, KeyAction>

export type PrefixState = 'idle' | 'waiting'

// ===== Layout Types =====

export type PresetLayout =
  | 'even-horizontal'
  | 'even-vertical'
  | 'main-horizontal'
  | 'main-vertical'
  | 'tiled'

// ===== Copy Mode =====

export interface CopyModeState {
  active: boolean
  paneId: string
  cursorRow: number
  cursorCol: number
  selectionStart?: { row: number; col: number }
  selectionEnd?: { row: number; col: number }
  searchQuery?: string
}

// ===== Direction =====

export type Direction = 'up' | 'down' | 'left' | 'right'

// ===== Engine Events =====

export type EngineEventType =
  | 'state-changed'
  | 'command-executed'
  | 'command-error'
  | 'session-created'
  | 'session-closed'
  | 'window-created'
  | 'window-closed'
  | 'pane-created'
  | 'pane-closed'
  | 'pane-split'
  | 'detached'
  | 'attached'

export interface EngineEvent {
  type: EngineEventType
  data?: unknown
}

export type EngineEventHandler = (event: EngineEvent) => void
