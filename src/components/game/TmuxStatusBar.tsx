import { renderStatus } from '@/core/status-format'
import type { TmuxState } from '@/core/types'
import { useClock } from '@/hooks/useClock'
import { styleColours } from './status-style'

const DEFAULT_COLOURS = { background: '#1e293b', color: '#94a3b8' }

/** tmux's status line, drawn from the `status-*` options; nothing while detached or when `status` is off. */
export function TmuxStatusBar({ state }: { state: TmuxState }) {
  const status = renderStatus(state, useClock())
  if (!status?.visible) return null

  return (
    <div
      data-testid="status-line"
      data-position={status.position}
      className="flex shrink-0 items-center justify-between whitespace-pre font-[family-name:var(--font-mono)] text-xs"
      style={{ padding: '3px 10px', ...DEFAULT_COLOURS, ...styleColours(status.style) }}
    >
      <div className="flex min-w-0 gap-2">
        <span>{status.left}</span>
        {status.windows.map(window => (
          <span key={window.index} className={window.current ? 'font-bold' : undefined}>
            {`${window.index}:${window.name}${window.current ? '*' : ''}`}
          </span>
        ))}
      </div>
      <span>{status.right}</span>
    </div>
  )
}
