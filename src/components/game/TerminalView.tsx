import { useCallback, useEffect, useRef } from 'react'
import { selectionRange } from '@/core/copy-mode'
import { closeEditor, readFile } from '@/core/files'
import { cancelPrefix } from '@/core/key-handler'
import { getOption } from '@/core/options'
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

function fileText(state: TmuxState, path: string): string {
  const file = readFile(state, path)
  return file.ok ? file.value : ''
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
    inputRef.current?.focus()
  }

  const window = state.isDetached ? null : getActiveWindow(state)
  const editing = state.editing
  const statusBar = <TmuxStatusBar state={state} />
  const statusOnTop = getOption(state, 'status-position') === 'top'

  return (
    <div className="flex h-full min-h-0 flex-col">
      {statusOnTop && statusBar}
      <div className="relative min-h-0 flex-1" style={{ padding: '8px' }}>
        {editing !== null ? (
          <FileEditor
            key={editing}
            path={editing}
            initialText={fileText(state, editing)}
            onSave={text => play({ type: 'save', path: editing, text })}
            onClose={() => update(closeEditor)}
          />
        ) : window ? (
          <PaneRenderer
            tree={window.layoutTree}
            activePaneId={window.activePaneId}
            zoomed={window.zoomed}
            copy={state.copyMode && { mode: state.copyMode, range: selectionRange(state) }}
            onPaneClick={disabled ? undefined : clickPane}
          />
        ) : (
          <PaneRenderer tree={{ type: 'pane', pane: state.outer }} activePaneId={state.outer.id} />
        )}
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
        prefixPending={state.prefixPending}
        onSubmit={text => play({ type: 'line', text })}
      />
    </div>
  )
}
