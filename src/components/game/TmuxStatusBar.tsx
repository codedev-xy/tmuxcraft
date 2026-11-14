import { renderStatus } from '@/core/status-format'
import type { TmuxState } from '@/core/types'
import { useClock } from '@/hooks/useClock'
import { styleColours } from './status-style'

/**
 * tmux's status line, drawn from the `status-*` options; nothing while detached or when `status` is off.
 * The colours the player set with `status-style` are run-time data, so they go in `style` over the theme ones.
 */
export function TmuxStatusBar({ state }: { state: TmuxState }) {
  const status = renderStatus(state, useClock())
  if (!status?.visible) return null

  return (
    <div
      data-testid="status-line"
      data-position={status.position}
      className="flex shrink-0 items-center justify-between gap-2 overflow-hidden bg-term-surface px-2.5 py-0.5 font-mono text-xs whitespace-pre text-term-muted"
      style={styleColours(status.style)}
    >
      <div className="flex min-w-0 gap-2 overflow-hidden">
        <span>{status.left}</span>
        {status.windows.map(window => (
          <span key={window.index} className={window.current ? 'font-bold' : undefined}>
            {`${window.index}:${window.name}${window.current ? '*' : ''}`}
          </span>
        ))}
      </div>
      <span className="truncate">{status.right}</span>
    </div>
  )
}
