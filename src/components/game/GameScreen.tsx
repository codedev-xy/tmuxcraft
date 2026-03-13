import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { PaneRenderer } from './PaneRenderer'
import { TmuxStatusBar } from './TmuxStatusBar'
import { ObjectivesPanel } from './ObjectivesPanel'
import { CompletionModal } from './CompletionModal'
import { renderHintText } from './hint-utils'
import { useTmuxEngine } from '@/hooks/useTmuxEngine'
import { useKeyCapture } from '@/hooks/useKeyCapture'
import { CommandParser } from '@/core/command-parser'
import { validateLevel } from '@/game/validator'
import { calculateStars } from '@/game/scoring'
import { getHint } from '@/game/hint-system'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { chapter1Levels } from '@/game/levels/chapter1'
import { chapter2Levels } from '@/game/levels/chapter2'
import { chapter3Levels } from '@/game/levels/chapter3'
import type { ParsedCommand } from '@/core/types'
import { isParseError } from '@/core/types'

const allLevels = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels]

const parser = new CommandParser()

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

  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([])
  const [currentHintLevel, setCurrentHintLevel] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [error, setError] = useState('')
  const [objectiveFlash, setObjectiveFlash] = useState(false)
  const [terminalShake, setTerminalShake] = useState(false)
  const [prevCompleted, setPrevCompleted] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)

  const { state, execute, reset } = useTmuxEngine(currentLevel?.initialState)

  const validation = useMemo(
    () => currentLevel ? validateLevel(state, currentLevel) : { isComplete: false, progress: 0, completedObjectives: [] as string[], remainingObjectives: [] as string[] },
    [state, currentLevel]
  )

  // Reset local state when level changes
  useEffect(() => {
    setInput('')
    commandHistoryRef.current = []
    historyIndexRef.current = -1
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
    addCommand()
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

  // Validate after each command
  useEffect(() => {
    if (!currentLevel || isLevelComplete || commandCount === 0) return
    if (validation.isComplete) {
      const stars = calculateStars(commandCount, currentLevel.optimalSteps, hintsUsed)
      markComplete(stars)
      completeLevel(currentLevel.id, stars, commandCount)
    }
  }, [validation, currentLevel, isLevelComplete, commandCount, hintsUsed, markComplete, completeLevel])

  // Detect newly completed objectives for flash effect
  useEffect(() => {
    if (!currentLevel || commandCount === 0) return
    const newlyCompleted = validation.completedObjectives.filter(id => !prevCompleted.includes(id))
    if (newlyCompleted.length > 0) {
      setObjectiveFlash(true)
      setPrevCompleted(validation.completedObjectives)
      const timer = setTimeout(() => setObjectiveFlash(false), 600)
      return () => clearTimeout(timer)
    }
  }, [validation, currentLevel, commandCount, prevCompleted])

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return
    const trimmed = input.trim()
    commandHistoryRef.current = [...commandHistoryRef.current, trimmed]
    historyIndexRef.current = -1

    const result = parser.parseInput(trimmed)
    if (isParseError(result)) {
      setError(result.message)
      setOutput(prev => [...prev, `$ ${trimmed}`, `Error: ${result.message}`].slice(-50))
      resetCombo()
      setTerminalShake(true)
      setTimeout(() => setTerminalShake(false), 400)
    } else {
      setOutput(prev => [...prev, `$ ${trimmed}`].slice(-50))
      handleCommand(result)
    }
    setInput('')
  }, [input, handleCommand, resetCombo])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const history = commandHistoryRef.current
      if (history.length === 0) return
      const newIndex = historyIndexRef.current < 0
        ? history.length - 1
        : Math.max(0, historyIndexRef.current - 1)
      historyIndexRef.current = newIndex
      setInput(history[newIndex])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndexRef.current < 0) return
      const history = commandHistoryRef.current
      const newIndex = historyIndexRef.current + 1
      if (newIndex >= history.length) {
        historyIndexRef.current = -1
        setInput('')
      } else {
        historyIndexRef.current = newIndex
        setInput(history[newIndex])
      }
    }
  }, [handleSubmit])

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

  const handleNextLevel = useCallback(() => {
    if (!currentLevel) return
    const currentIndex = allLevels.findIndex(l => l.id === currentLevel.id)
    const next = currentIndex >= 0 ? allLevels[currentIndex + 1] : null
    if (next) {
      startLevel(next)
    } else {
      setScreen('level-select')
    }
  }, [currentLevel, startLevel, setScreen])

  if (!currentLevel) return null

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId)
  const activeWindow = activeSession?.windows[activeSession.activeWindowIndex]
  const efficiency = commandCount > 0 ? Math.round((currentLevel.optimalSteps / commandCount) * 100) : 100
  const quickRef = chapterQuickRef[currentLevel.chapter] || chapterQuickRef[1]
  const hasNextLevel = allLevels.findIndex(l => l.id === currentLevel.id) < allLevels.length - 1

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Top Bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScreen('level-select')}
            className="font-[family-name:var(--font-ui)] text-xs w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-white/20"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8' }}
          >
            ←
          </button>
          <span
            className="font-[family-name:var(--font-pixel)] text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff' }}
          >
            Lv {currentLevel.chapter}-{currentLevel.level}
          </span>
          <span className="font-[family-name:var(--font-pixel)] text-sm font-bold text-white/90">{t(currentLevel.titleKey)}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Mini objective dots */}
          <div className="flex items-center gap-1.5">
            {currentLevel.objectives.map((obj) => {
              const done = commandCount > 0 && validation.completedObjectives.includes(obj.id)
              return (
                <motion.div
                  key={obj.id}
                  animate={done ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: '10px',
                    height: '10px',
                    background: done ? '#4ade80' : 'rgba(255,255,255,0.2)',
                    boxShadow: done ? '0 0 8px rgba(74,222,128,0.5)' : 'none',
                  }}
                />
              )
            })}
          </div>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[0, 1, 2].map(i => {
              const stars = isLevelComplete ? calculateStars(commandCount, currentLevel.optimalSteps, hintsUsed) : null
              const earned = stars && (i === 0 ? stars.completed : i === 1 ? stars.efficient : stars.noHints)
              return (
                <span
                  key={i}
                  className="text-base"
                  style={{
                    color: earned ? '#fbbf24' : 'rgba(255,255,255,0.25)',
                    filter: earned ? 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' : 'none',
                  }}
                >
                  {earned ? '\u2605' : '\u2606'}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden" style={{ padding: '12px', gap: '12px' }}>
        {/* Left - Terminal */}
        <motion.div
          className="flex flex-col w-[60%] overflow-hidden rounded-xl"
          style={{
            background: '#1e293b',
            border: '1px solid #475569',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
          animate={terminalShake ? { x: [0, -4, 4, -3, 3, -1, 1, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Terminal Title Bar */}
          <div
            className="flex items-center shrink-0 px-3 py-2"
            style={{
              background: 'linear-gradient(180deg, #334155, #1e293b)',
              borderBottom: '1px solid #475569',
            }}
          >
            <div className="flex gap-1.5 mr-3">
              <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500">
              tmux — {activeSession ? `${activeSession.name}` : 'bash'}
            </span>
          </div>

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
            className="overflow-y-auto font-[family-name:var(--font-mono)] text-xs leading-relaxed"
            style={{
              height: '128px',
              padding: '8px 10px',
              background: '#0f172a',
              borderTop: '1px solid #334155',
            }}
          >
            {output.length === 0 ? (
              <div
                className="h-full flex items-center justify-center"
                style={{ color: '#334155', fontSize: '0.75rem', letterSpacing: '0.05em' }}
              >
                {t('game.outputPlaceholder')}
              </div>
            ) : output.slice(-20).map((line, i) => {
              if (line.startsWith('Error')) {
                return <div key={i} style={{ color: '#ef4444' }}>{line}</div>
              }
              if (line.startsWith('$ ')) {
                return (
                  <div key={i}>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>$ </span>
                    <span style={{ color: '#e2e8f0' }}>{line.slice(2)}</span>
                  </div>
                )
              }
              return <div key={i} style={{ color: '#64748b' }}>{line}</div>
            })}
          </div>

          {/* Terminal Input */}
          <div
            className="flex items-center font-[family-name:var(--font-mono)] text-sm"
            style={{
              padding: '10px 12px',
              background: 'linear-gradient(180deg, #1e293b, #172033)',
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
            <span
              className="font-[family-name:var(--font-mono)] font-bold"
              style={{ marginRight: '6px', color: '#22c55e' }}
            >
              $
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none"
              style={{ color: '#e2e8f0', caretColor: '#22c55e' }}
              placeholder={prefixActive ? t('game.prefixActive') : 'Type a tmux command...'}
              autoFocus
              disabled={isLevelComplete}
            />
          </div>
        </motion.div>

        {/* Right - Objectives Panel */}
        <ObjectivesPanel
          currentLevel={currentLevel}
          validation={validation}
          commandCount={commandCount}
          objectiveFlash={objectiveFlash}
          efficiency={efficiency}
          optimalSteps={currentLevel.optimalSteps}
        />
      </div>

      {/* Bottom Task Bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #1e293b, #334155)',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Quick ref commands */}
          <span className="font-[family-name:var(--font-pixel)] text-[10px] text-slate-500 tracking-wider mr-1">REF</span>
          {quickRef.slice(0, 4).map((cmd, i) => (
            <span
              key={i}
              className="text-[11px] font-[family-name:var(--font-mono)] px-2.5 py-1 rounded-md"
              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8' }}
            >
              {cmd}
            </span>
          ))}
          {/* Combo counter */}
          <AnimatePresence>
            {comboCount > 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="font-[family-name:var(--font-pixel)] text-xs px-3 py-1 rounded-full"
                style={{ color: comboColor(comboCount), ...comboBgStyle(comboCount) }}
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
        <div className="flex items-center gap-2.5">
          {error && (
            <span className="font-[family-name:var(--font-ui)] text-xs mr-1 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </span>
          )}
          <button
            onClick={handleRetry}
            className="text-xs font-[family-name:var(--font-ui)] px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/15"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}
          >
            🔄 {t('game.retry')}
          </button>
          <button
            onClick={handleHint}
            disabled={currentHintLevel >= 3 || isLevelComplete}
            className="text-xs font-[family-name:var(--font-ui)] px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 disabled:opacity-30"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#fbbf24',
              cursor: currentHintLevel >= 3 || isLevelComplete ? 'default' : 'pointer',
            }}
          >
            💡 {t('game.hint')} ({3 - currentHintLevel})
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
      <CompletionModal
        isVisible={isLevelComplete}
        currentLevel={currentLevel}
        commandCount={commandCount}
        hintsUsed={hintsUsed}
        onRetry={handleRetry}
        onNextLevel={handleNextLevel}
        hasNextLevel={hasNextLevel}
      />
    </div>
  )
}
