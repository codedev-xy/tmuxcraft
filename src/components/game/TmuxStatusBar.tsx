import type { Session } from '@/core/types'

interface TmuxStatusBarProps {
  session?: Session
}

export function TmuxStatusBar({ session }: TmuxStatusBarProps) {
  if (!session) return null

  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return (
    <div
      className="flex items-center justify-between font-[family-name:var(--font-mono)] text-xs"
      style={{
        padding: '4px 12px',
        background: '#1e293b',
        color: '#94a3b8',
        borderTop: '1px solid #334155',
      }}
    >
      <div className="flex items-center" style={{ gap: '8px' }}>
        <span
          className="font-bold"
          style={{
            color: '#ffffff',
            background: '#0ea5e9',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          [{session.name}]
        </span>
        {session.windows.map((win, i) => (
          <span
            key={win.id}
            style={
              i === session.activeWindowIndex
                ? {
                    color: '#0ea5e9',
                    fontWeight: 700,
                    borderBottom: '2px solid #0ea5e9',
                    paddingBottom: '2px',
                  }
                : {
                    color: '#94a3b8',
                    transition: 'color 0.2s',
                  }
            }
          >
            {i}:{win.name}{i === session.activeWindowIndex ? '*' : ''}
          </span>
        ))}
      </div>
      <span style={{ color: '#94a3b8' }}>{time}</span>
    </div>
  )
}
