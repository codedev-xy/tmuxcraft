import type { TmuxState } from '@/core/types'
import type { InputResult } from '@/game/sim/simulate'
import { useTmuxSession } from '@/hooks/useTmuxSession'
import { TerminalView } from '../TerminalView'

export function Harness({ initial, onResult, disabled }: { initial: TmuxState; onResult?: (result: InputResult) => void; disabled?: boolean }) {
  const session = useTmuxSession(initial)
  return <TerminalView session={session} onResult={onResult} disabled={disabled} />
}
