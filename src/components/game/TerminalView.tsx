import { useCallback, useEffect, useRef } from 'react'
import { selectionRange } from '@/core/copy-mode'
import { closeEditor, readFile } from '@/core/files'
import { cancelPrefix } from '@/core/key-handler'
import { getOption, isOn } from '@/core/options'
import { cancelPrompt } from '@/core/prompt'
import { getActiveWindow } from '@/core/selectors'
import type { KeyId, TmuxState } from '@/core/types'
import type { InputResult, PlayerInput } from '@/game/sim/simulate'
import { useKeyCapture } from '@/hooks/useKeyCapture'
import type { TmuxSession } from '@/hooks/useTmuxSession'
import { CommandLine } from './CommandLine'
import { FileEditor } from './FileEditor'
import { OutputLog } from './OutputLog'
import { PaneRenderer } from './PaneRenderer'
import type { DragInput } from './pane-drag'
import { PromptLine } from './PromptLine'
import { TmuxStatusBar } from './TmuxStatusBar'

/** How long tmux waits for the key after the prefix before giving up on it. */
export const PREFIX_TIMEOUT_MS = 2000

interface TerminalViewProps {
  session: TmuxSession
  /** Called with every input tmux took: lines, prompt answers, saves, and the keys and clicks it handled. */
  onResult?: (result: InputResult) => void
  /** No more input, e.g. once the level is complete. */
  disabled?: boolean
}

interface ScreenProps {
  state: TmuxState
  play: (input: PlayerInput) => InputResult
  update: TmuxSession['update']
  onPaneClick?: (paneId: string) => void
  onDrag?: (drag: DragInput) => void
}

function fileText(state: TmuxState, path: string): string {
  const file = readFile(state, path)
  return file.ok ? file.value : ''
}

/** What fills the terminal: the editor, the panes of the current window, or the shell outside tmux. */
function TerminalScreen({ state, play, update, onPaneClick, onDrag }: ScreenProps) {
  const { editing } = state
  if (editing !== null) {
    return (
      <FileEditor
        key={editing}
        path={editing}
        initialText={fileText(state, editing)}
        onSave={text => play({ type: 'save', path: editing, text })}
        onClose={() => update(closeEditor)}
      />
    )
  }
  const window = state.isDetached ? null : getActiveWindow(state)
  if (!window) return <PaneRenderer tree={{ type: 'pane', pane: state.outer }} activePaneId={state.outer.id} />
  return (
    <PaneRenderer
      tree={window.layoutTree}
      activePaneId={window.activePaneId}
      zoomed={window.zoomed}
      copy={state.copyMode && { mode: state.copyMode, range: selectionRange(state) }}
      onPaneClick={onPaneClick}
      onDrag={onDrag}
    />
  )
}

/** The simulated terminal: panes (or the editor), status line, tmux prompt, log and command box. */
export function TerminalView({ session, onResult, disabled = false }: TerminalViewProps) {
  const { state, transcript, send, update } = session
  const inputRef = useRef<HTMLInputElement>(null)

  const play = useCallback((input: PlayerInput): InputResult => {
    const result = send(input)
    if (result.handled) onResult?.(result)
    return result
  }, [send, onResult])

  useKeyCapture(useCallback((key: KeyId) => play({ type: 'key', key }).handled, [play]), !disabled)

  useEffect(() => {
    if (!state.prefixPending) return
    const timer = setTimeout(() => update(cancelPrefix), PREFIX_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state.prefixPending, update])

  // The prompt and the editor take the focus while open; it goes back to the command box after.
  const modalOpen = state.prompt !== null || state.editing !== null
  useEffect(() => {
    if (!modalOpen && !disabled) inputRef.current?.focus()
  }, [modalOpen, disabled])

  const clickPane = (paneId: string) => {
    play({ type: 'click', paneId })
    if (!modalOpen) inputRef.current?.focus()
  }
  const dragBorder = (drag: DragInput) => play({ type: 'drag', ...drag })

  const statusBar = <TmuxStatusBar state={state} />
  const statusOnTop = getOption(state, 'status-position') === 'top'

  return (
    <div className="on-dark flex h-full min-h-0 flex-col bg-term-bg">
      {statusOnTop && statusBar}
      <div className="relative min-h-0 flex-1 p-2">
        <TerminalScreen
          state={state}
          play={play}
          update={update}
          onPaneClick={disabled ? undefined : clickPane}
          onDrag={disabled || !isOn(state, 'mouse') ? undefined : dragBorder}
        />
      </div>
      {!statusOnTop && statusBar}
      {state.prompt && (
        <PromptLine
          key={state.prompt.template}
          prompt={state.prompt}
          onSubmit={text => play({ type: 'prompt', text })}
          onCancel={() => update(cancelPrompt)}
        />
      )}
      <OutputLog transcript={transcript} />
      <CommandLine
        inputRef={inputRef}
        disabled={disabled}
        pendingPrefix={state.prefixPending ? getOption(state, 'prefix') : null}
        onSubmit={text => play({ type: 'line', text })}
      />
    </div>
  )
}
