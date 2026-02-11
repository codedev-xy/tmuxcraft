import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { PaneRenderer } from './PaneRenderer'
import { TmuxStatusBar } from './TmuxStatusBar'
import { useTmuxEngine } from '@/hooks/useTmuxEngine'
import { useKeyCapture } from '@/hooks/useKeyCapture'
import { CommandParser } from '@/core/command-parser'
import { validateLevel } from '@/game/validator'
import { calculateStars } from '@/game/scoring'
import { getHint } from '@/game/hint-system'
import { countPanes } from '@/core/layout-engine'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { chapter1Levels } from '@/game/levels/chapter1'
import { chapter2Levels } from '@/game/levels/chapter2'
import { chapter3Levels } from '@/game/levels/chapter3'
import type { ParsedCommand } from '@/core/types'
import { isParseError } from '@/core/types'

const allLevels = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels]

const parser = new CommandParser()

/** Keyboard shortcut style for <kbd> elements in hints */
const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85em',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: '5px',
  background: '#eef6ff',
  border: '1px solid #bae6fd',
  boxShadow: '0 1px 2px rgba(14,165,233,0.12)',
  color: '#0369a1',
  whiteSpace: 'nowrap',
  display: 'inline-block',
  lineHeight: 1.4,
}

/**
 * Parse hint text and wrap keyboard shortcuts / commands in styled <kbd> elements.
 *
 * Key handling for "Ctrl+b ," style shortcuts:
 * - After "Ctrl+b " we explicitly match ANY single char (including , " % ! etc.)
 *   or multi-char keys like Space, 方向键, Ctrl+→, n/p, 数字
 */
function renderHintText(text: string): React.ReactNode {
  // Order matters — longer / more specific patterns first.
  // Group 1: Ctrl+b + Ctrl+<key>  (e.g. Ctrl+b Ctrl+→, Ctrl+b Ctrl+方向键)
  // Group 2: Ctrl+b + multi-char key (Space, 方向键, Arrow) or slash pair (n/p)
  // Group 3: Ctrl+b + single char (covers , " % ! { } [ ] x z d c → ↓ digits etc.)
  // Group 4: Colon commands  :xxx ...args
  // Group 5: tmux CLI commands
  // Group 6: standalone "exit"
  const pattern = new RegExp(
    [
      /Ctrl\+b\s+Ctrl\+(?:方向键|[a-zA-Z0-9→←↑↓]+)/.source,                  // Ctrl+b Ctrl+→ / Ctrl+b Ctrl+方向键
      /Ctrl\+b\s+(?:Space|方向键|Arrow|数字)/.source,                       // Ctrl+b Space
      /Ctrl\+b\s+\S(?:\/\S)?/.source,                                     // Ctrl+b , | Ctrl+b " | Ctrl+b n/p
      /:[a-z][-a-z]*(?:\s+[-a-zA-Z0-9<>~%\/.':_]+)*/.source,              // :split-window -h
      /tmux\s+(?:new(?:\s+-s\s+\S+)?|attach(?:\s+-t\s+\S+)?|ls)/.source,  // tmux new -s name
      /\bexit\b/.source,                                                    // exit
    ].join('|'),
    'g',
  )

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIdx = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<kbd key={keyIdx++} style={kbdStyle}>{match[0]}</kbd>)
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

/** Color for combo counter based on streak length */
function comboColor(count: number): string {
  if (count >= 10) return '#ef4444'
  if (count >= 7) return '#ec4899'
  if (count >= 4) return '#f59e0b'
  return '#0ea5e9'
}

/** Background for combo badge */
function comboBgStyle(count: number): React.CSSProperties {
  if (count >= 10) return { background: '#fef2f2', border: '1px solid #fecaca' }
  if (count >= 7) return { background: '#fdf2f8', border: '1px solid #fbcfe8' }
  if (count >= 4) return { background: '#fffbeb', border: '1px solid #fde68a' }
  return { background: '#f0f9ff', border: '1px solid #bae6fd' }
}

/** Quick-reference commands per chapter */
const chapterQuickRef: Record<number, string[]> = {
  1: ['tmux new', 'Ctrl+b %', 'Ctrl+b "', 'Ctrl+b arrow', 'Ctrl+b c', 'Ctrl+b n'],
  2: ['Ctrl+b z', 'Ctrl+b {', 'Ctrl+b }', 'Ctrl+b !', 'Ctrl+b :resize-pane'],
  3: ['tmux new -s name', 'Ctrl+b $', 'Ctrl+b s', 'Ctrl+b d', 'tmux ls'],
}

export function GameScreen() {
  const { t } = useTranslation()
  const { currentLevel, commandCount, hintsUsed, comboCount, isLevelComplete, addCommand, incrementCombo, resetCombo, useHint: markHintUsed, completeLevel: markComplete, resetLevel, setScreen, startLevel } = useGameStore()
  const completeLevel = useProgressStore(s => s.completeLevel)
  const checkContextAchievements = useProgressStore(s => s.checkContextAchievements)

  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [output, setOutput] = useState<string[]>([])
  const [currentHintLevel, setCurrentHintLevel] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [error, setError] = useState('')
  const [objectiveFlash, setObjectiveFlash] = useState(false)
  const [terminalShake, setTerminalShake] = useState(false)
  const [prevCompleted, setPrevCompleted] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const { state, execute, reset } = useTmuxEngine(currentLevel?.initialState)

  // Reset local state when level changes
  useEffect(() => {
    setInput('')
    setCommandHistory([])
    setHistoryIndex(-1)
    setOutput([])
    setCurrentHintLevel(0)
    setShowHint(false)
    setError('')
    setObjectiveFlash(false)
    setTerminalShake(false)
    setPrevCompleted([])
  }, [currentLevel?.id])

  // Auto-scroll command output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const handleCommand = useCallback((cmd: ParsedCommand) => {
    execute(cmd)
    addCommand(cmd.raw)
    setError('')
    incrementCombo()
  }, [execute, addCommand, incrementCombo])

  // Key capture for prefix shortcuts
  const { prefixActive } = useKeyCapture(
    useCallback((action) => {
      if (action.command === 'rename-window') {
        const name = prompt(t('game.enterWindowName') || 'Enter window name:')
        if (name) {
          handleCommand({ type: action.command, args: { ...action.args, name }, raw: `Ctrl+b ,` })
        }
      } else {
        handleCommand({ type: action.command, args: action.args || {}, raw: `Ctrl+b ${action.display}` })
      }
    }, [handleCommand, t]),
    !isLevelComplete
  )

  // Validate after each command (skip when no commands executed to avoid race conditions on level transitions)
  useEffect(() => {
    if (!currentLevel || isLevelComplete || commandCount === 0) return
    const validation = validateLevel(state, currentLevel)
    if (validation.isComplete) {
      const stars = calculateStars(commandCount, currentLevel.optimalSteps, hintsUsed)
      markComplete(stars)
      completeLevel(currentLevel.id, stars, commandCount)
    }
  }, [state, currentLevel, isLevelComplete, commandCount, hintsUsed, markComplete, completeLevel])

  // Detect newly completed objectives for flash effect
  useEffect(() => {
    if (!currentLevel || commandCount === 0) return
    const validation = validateLevel(state, currentLevel)
    const newlyCompleted = validation.completedObjectives.filter(id => !prevCompleted.includes(id))
    if (newlyCompleted.length > 0) {
      setObjectiveFlash(true)
      setPrevCompleted(validation.completedObjectives)
      const timer = setTimeout(() => setObjectiveFlash(false), 600)
      return () => clearTimeout(timer)
    }
  }, [state, currentLevel, commandCount, prevCompleted])

  // Check context-dependent achievements (combo, pane count)
  useEffect(() => {
    if (commandCount === 0) return
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId)
    const activeWindow = activeSession?.windows[activeSession.activeWindowIndex]
    const paneCount = activeWindow ? countPanes(activeWindow.layoutTree) : 0
    checkContextAchievements({ currentCombo: comboCount, currentPaneCount: paneCount })
  }, [comboCount, state, commandCount, checkContextAchievements])

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return
    const trimmed = input.trim()
    setCommandHistory(prev => [...prev, trimmed])
    setHistoryIndex(-1)

    const result = parser.parseInput(trimmed)
    if (isParseError(result)) {
      setError(result.message)
      setOutput(prev => [...prev, `$ ${trimmed}`, `Error: ${result.message}`])
      resetCombo()
      // Shake effect on error
      setTerminalShake(true)
      setTimeout(() => setTerminalShake(false), 400)
    } else {
      setOutput(prev => [...prev, `$ ${trimmed}`])
      handleCommand(result)
    }
    setInput('')
  }, [input, handleCommand, resetCombo])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < 0 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
      }
    }
  }

  const handleHint = () => {
    if (!currentLevel || currentHintLevel >= 3) return
    const newLevel = (currentHintLevel + 1) as 1 | 2 | 3
    setCurrentHintLevel(newLevel)
    setShowHint(true)
    markHintUsed()
  }

  const handleRetry = () => {
    reset(currentLevel?.initialState)
    resetLevel()
    setOutput([])
    setInput('')
    setCurrentHintLevel(0)
    setShowHint(false)
    setError('')
    setPrevCompleted([])
  }

  if (!currentLevel) return null

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId)
  const activeWindow = activeSession?.windows[activeSession.activeWindowIndex]
  const validation = validateLevel(state, currentLevel)
  const completedCount = commandCount > 0 ? validation.completedObjectives.length : 0
  const totalObjectives = currentLevel.objectives.length
  const progressRatio = totalObjectives > 0 ? completedCount / totalObjectives : 0
  const efficiency = commandCount > 0 ? Math.round((currentLevel.optimalSteps / commandCount) * 100) : 100
  const quickRef = chapterQuickRef[currentLevel.chapter] || chapterQuickRef[1]

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Top Bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="flex items-center" style={{ gap: '16px' }}>
          <button
            onClick={() => setScreen('level-select')}
            className="font-[family-name:var(--font-ui)] text-sm"
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            &lt;
          </button>
          <span
            className="font-[family-name:var(--font-pixel)] text-base font-semibold"
            style={{
              padding: '4px 14px',
              borderRadius: '9999px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0ea5e9',
            }}
          >
            Lv {currentLevel.chapter}-{currentLevel.level}
          </span>
          <span className="font-[family-name:var(--font-pixel)] text-lg font-bold" style={{ color: '#1e293b' }}>{t(currentLevel.titleKey)}</span>
        </div>
        <div className="flex items-center" style={{ gap: '16px' }}>
          {/* Mini objective dots */}
          <div className="flex items-center" style={{ gap: '8px' }}>
            {currentLevel.objectives.map((obj) => {
              const done = commandCount > 0 && validation.completedObjectives.includes(obj.id)
              return (
                <motion.div
                  key={obj.id}
                  animate={done ? { scale: [1, 1.3, 1] } : {}}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    transition: 'all 0.3s',
                    background: done ? '#22c55e' : '#e2e8f0',
                    boxShadow: done ? '0 0 6px rgba(34, 197, 94, 0.4)' : 'none',
                  }}
                />
              )
            })}
          </div>
          <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
          {/* Stars */}
          <div className="flex items-center" style={{ gap: '4px' }}>
            {[0, 1, 2].map(i => {
              const stars = isLevelComplete ? calculateStars(commandCount, currentLevel.optimalSteps, hintsUsed) : null
              const earned = stars && (i === 0 ? stars.completed : i === 1 ? stars.efficient : stars.noHints)
              return (
                <span key={i} style={{ fontSize: '20px', color: earned ? '#f59e0b' : '#cbd5e1' }}>
                  {earned ? '\u2B50' : '\u2606'}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden" style={{ padding: '12px', gap: '12px' }}>
        {/* Left - Terminal (stays dark) */}
        <motion.div
          className="flex flex-col w-[60%] overflow-hidden"
          style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
          }}
          animate={terminalShake ? { x: [0, -4, 4, -3, 3, -1, 1, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Pane Visualization */}
          <div className="flex-1 relative" style={{ padding: '8px' }}>
            {state.isDetached ? (
              <div className="flex items-center justify-center h-full font-[family-name:var(--font-mono)]" style={{ color: '#94a3b8' }}>
                <div className="text-center">
                  <div className="font-[family-name:var(--font-pixel)] text-lg" style={{ marginBottom: '8px', color: '#0ea5e9' }}>[detached]</div>
                  <div className="text-sm" style={{ color: '#64748b' }}>Type `tmux attach` to reconnect</div>
                </div>
              </div>
            ) : activeWindow ? (
              <PaneRenderer tree={activeWindow.layoutTree} activePaneId={activeWindow.activePaneId} />
            ) : null}
          </div>

          {/* Status Bar */}
          {activeSession && !state.isDetached && <TmuxStatusBar session={activeSession} />}

          {/* Command Output */}
          <div
            ref={outputRef}
            className="overflow-y-auto font-[family-name:var(--font-mono)] text-xs"
            style={{
              height: '128px',
              padding: '8px',
              background: '#0f172a',
              borderTop: '1px solid #334155',
            }}
          >
            {output.slice(-20).map((line, i) => (
              <div key={i} style={{ color: line.startsWith('Error') ? '#ef4444' : '#94a3b8' }}>{line}</div>
            ))}
          </div>

          {/* Terminal Input */}
          <div
            className="flex items-center font-[family-name:var(--font-mono)] text-sm"
            style={{
              padding: '8px 12px',
              background: '#1e293b',
              borderTop: '1px solid #334155',
              transition: 'background 0.2s',
            }}
          >
            <AnimatePresence>
              {prefixActive && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="font-[family-name:var(--font-pixel)] text-xs animate-pulse"
                  style={{
                    marginRight: '8px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                  }}
                >
                  PREFIX
                </motion.span>
              )}
            </AnimatePresence>
            <span style={{ marginRight: '4px', color: '#0ea5e9' }}>$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none"
              style={{ color: '#e2e8f0' }}
              placeholder={prefixActive ? t('game.prefixActive') : 'Type a tmux command...'}
              autoFocus
              disabled={isLevelComplete}
            />
          </div>
        </motion.div>

        {/* Right - Objectives Panel (light theme) */}
        <div
          className={`w-[40%] flex flex-col h-full overflow-hidden transition-all duration-500`}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: objectiveFlash
              ? '0 2px 12px rgba(0,0,0,0.06), 0 0 0 2px rgba(34, 197, 94, 0.3)'
              : '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {/* Section 1: Task description card */}
          <div style={{ padding: '20px 16px 0 16px' }}>
            <div
              className="stat-card"
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                borderLeft: '4px solid #0ea5e9',
                padding: '16px',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <span className="font-[family-name:var(--font-pixel)] text-sm" style={{ color: '#0ea5e9' }}>{t('game.task')}</span>
                <span className="font-[family-name:var(--font-ui)] text-sm font-bold" style={{ color: '#0ea5e9' }}>
                  {completedCount}/{totalObjectives}
                </span>
              </div>
              <div
                style={{
                  marginBottom: '12px',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRatio * 100}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  style={{
                    height: '100%',
                    borderRadius: '3px',
                    background: 'linear-gradient(90deg, #0ea5e9, #22c55e)',
                  }}
                />
              </div>
              <p className="text-sm font-[family-name:var(--font-ui)] leading-relaxed" style={{ color: '#64748b' }}>{t(currentLevel.descriptionKey)}</p>
            </div>
          </div>

          {/* Section 2: Objectives list */}
          <div style={{ padding: '16px 16px 0 16px' }}>
            <div className="font-[family-name:var(--font-pixel)] text-xs tracking-wide" style={{ marginBottom: '12px', color: '#94a3b8' }}>OBJECTIVES</div>
            <div className="flex flex-col" style={{ gap: '12px' }}>
              {currentLevel.objectives.map((obj) => {
                const completed = commandCount > 0 && validation.completedObjectives.includes(obj.id)
                return (
                  <motion.div
                    key={obj.id}
                    className="objective-card flex items-start"
                    style={{
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: completed
                        ? '1px solid #bbf7d0'
                        : '1px solid #e2e8f0',
                      background: completed
                        ? '#f0fdf4'
                        : '#f8fafc',
                      transition: 'all 0.3s',
                    }}
                    animate={completed ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.span
                      className="text-lg flex-shrink-0"
                      style={{ marginTop: '2px' }}
                      animate={completed ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      {completed ? '\u2705' : '\u2B1C'}
                    </motion.span>
                    <span
                      className={`font-[family-name:var(--font-ui)] text-sm leading-relaxed ${completed ? 'font-semibold' : ''}`}
                      style={{ color: completed ? '#16a34a' : '#64748b' }}
                    >
                      {t(obj.descriptionKey)}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Command hint card */}
          <div style={{ padding: '16px 16px 0 16px' }}>
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div className="font-[family-name:var(--font-pixel)] text-xs flex items-center" style={{ color: '#92400e', marginBottom: '8px', gap: '8px' }}>
                <span className="text-base">{'\uD83D\uDCA1'}</span>
                COMMAND HINT
              </div>
              <p className="text-sm font-[family-name:var(--font-mono)] leading-relaxed" style={{ color: '#92400e' }}>
                {renderHintText(t(getHint(currentLevel, 1)))}
              </p>
            </div>
          </div>

          {/* Spacer to push stats down */}
          <div className="flex-1" />

          {/* Section 4: Stats row of 3 mini-cards */}
          <div style={{ padding: '0 16px 20px 16px' }}>
            <div className="flex" style={{ gap: '12px' }}>
              <div
                className="flex-1 text-center stat-card"
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                }}
              >
                <div className="text-xl" style={{ marginBottom: '4px' }}>{'\u2328\uFE0F'}</div>
                <div className="font-[family-name:var(--font-ui)] text-xs" style={{ marginBottom: '4px', color: '#94a3b8' }}>CMDS</div>
                <div className="font-[family-name:var(--font-pixel)] text-2xl" style={{ color: '#0ea5e9' }}>{commandCount}</div>
              </div>
              <div
                className="flex-1 text-center stat-card"
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                }}
              >
                <div className="text-xl" style={{ marginBottom: '4px' }}>{'\uD83C\uDFAF'}</div>
                <div className="font-[family-name:var(--font-ui)] text-xs" style={{ marginBottom: '4px', color: '#94a3b8' }}>OPTIMAL</div>
                <div className="font-[family-name:var(--font-pixel)] text-2xl" style={{ color: '#1e293b' }}>{currentLevel.optimalSteps}</div>
              </div>
              <div
                className="flex-1 text-center stat-card"
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                }}
              >
                <div className="text-xl" style={{ marginBottom: '4px' }}>{'\u26A1'}</div>
                <div className="font-[family-name:var(--font-ui)] text-xs" style={{ marginBottom: '4px', color: '#94a3b8' }}>EFF.</div>
                <div
                  className="font-[family-name:var(--font-pixel)] text-2xl"
                  style={{ color: efficiency >= 100 ? '#22c55e' : efficiency >= 67 ? '#f59e0b' : '#ef4444' }}
                >
                  {commandCount > 0 ? `${efficiency}%` : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Task Bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -1px 4px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div className="flex items-center font-[family-name:var(--font-ui)] text-sm" style={{ gap: '16px' }}>
          {/* Quick ref commands */}
          <div className="flex items-center" style={{ gap: '8px' }}>
            <span className="font-[family-name:var(--font-pixel)] text-xs" style={{ marginRight: '4px', color: '#94a3b8' }}>REF:</span>
            {quickRef.slice(0, 4).map((cmd, i) => (
              <span
                key={i}
                className="text-xs font-[family-name:var(--font-mono)]"
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0ea5e9',
                }}
              >
                {cmd}
              </span>
            ))}
          </div>
          {/* Combo counter */}
          <AnimatePresence>
            {comboCount > 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: 1,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="font-[family-name:var(--font-pixel)] text-xs"
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: comboColor(comboCount),
                  ...comboBgStyle(comboCount),
                }}
              >
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  COMBO x{comboCount}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center" style={{ gap: '12px' }}>
          {error && (
            <span
              className="font-[family-name:var(--font-ui)] text-xs"
              style={{
                marginRight: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
              }}
            >
              {error}
            </span>
          )}
          <button
            onClick={handleRetry}
            className="text-sm font-[family-name:var(--font-ui)]"
            style={{
              padding: '8px 20px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {'\uD83D\uDD04'} {t('game.retry')}
          </button>
          <button
            onClick={handleHint}
            disabled={currentHintLevel >= 3 || isLevelComplete}
            className="text-sm font-[family-name:var(--font-ui)] disabled:opacity-30"
            style={{
              padding: '8px 20px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#92400e',
              cursor: currentHintLevel >= 3 || isLevelComplete ? 'default' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {'\uD83D\uDCA1'} {t('game.hint')} ({3 - currentHintLevel})
          </button>
        </div>
      </div>

      {/* Hint Display */}
      <AnimatePresence>
        {showHint && currentLevel && currentHintLevel > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed z-40"
            style={{
              bottom: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 20px',
              maxWidth: '448px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="flex items-start" style={{ gap: '10px' }}>
              <span className="text-base" style={{ color: '#f59e0b' }}>{'\uD83D\uDCA1'}</span>
              <p className="text-sm font-[family-name:var(--font-ui)] leading-relaxed" style={{ color: '#92400e' }}>{renderHintText(t(getHint(currentLevel, currentHintLevel as 1 | 2 | 3)))}</p>
              <button
                onClick={() => setShowHint(false)}
                className="text-sm font-bold"
                style={{ marginLeft: '8px', color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                x
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Complete Modal */}
      <AnimatePresence>
        {isLevelComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-center"
              style={{
                padding: '32px',
                maxWidth: '384px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div className="text-3xl" style={{ marginBottom: '8px' }}>{'\uD83C\uDF89'}</div>
              <h2 className="font-[family-name:var(--font-pixel)] text-lg" style={{ marginBottom: '24px', color: '#0ea5e9' }}>
                {t('game.levelComplete')}
              </h2>
              <div className="flex justify-center" style={{ gap: '24px', marginBottom: '24px' }}>
                {['completed', 'efficient', 'noHints'].map((key, i) => {
                  const stars = calculateStars(commandCount, currentLevel!.optimalSteps, hintsUsed)
                  const earned = key === 'completed' ? stars.completed : key === 'efficient' ? stars.efficient : stars.noHints
                  return (
                    <div key={key} className="text-center">
                      <motion.span
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: earned ? 1 : 0.7, rotate: 0 }}
                        transition={{ delay: i * 0.2, type: 'spring' }}
                        className="text-3xl block"
                        style={{
                          color: earned ? '#f59e0b' : '#cbd5e1',
                          filter: earned ? 'none' : 'grayscale(1)',
                          opacity: earned ? 1 : 0.4,
                        }}
                      >
                        {'\u2B50'}
                      </motion.span>
                      <span
                        className="font-[family-name:var(--font-pixel)] block"
                        style={{ fontSize: '9px', marginTop: '8px', color: '#94a3b8' }}
                      >
                        {t(`game.stars.${key}`)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center" style={{ gap: '12px' }}>
                <button
                  onClick={handleRetry}
                  className="text-xs font-[family-name:var(--font-ui)]"
                  style={{
                    padding: '8px 20px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('game.retry')}
                </button>
                <button onClick={() => {
                  const currentIndex = allLevels.findIndex(l => l.id === currentLevel?.id)
                  const next = currentIndex >= 0 ? allLevels[currentIndex + 1] : null
                  if (next) {
                    startLevel(next)
                  } else {
                    setScreen('level-select')
                  }
                }}
                  className="text-xs font-[family-name:var(--font-ui)] font-bold"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('game.nextLevel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
