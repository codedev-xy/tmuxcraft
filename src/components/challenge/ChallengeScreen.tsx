import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { PaneRenderer } from '@/components/game/PaneRenderer'
import { TmuxStatusBar } from '@/components/game/TmuxStatusBar'
import { useTmuxEngine } from '@/hooks/useTmuxEngine'
import { useKeyCapture } from '@/hooks/useKeyCapture'
import { CommandParser } from '@/core/command-parser'
import { generateChallenge } from '@/game/challenge/challenge-generator'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'
import { isParseError } from '@/core/types'
import type { ChallengeGoal } from '@/game/level-types'

const parser = new CommandParser()
const TIME_LIMIT = 60

export function ChallengeScreen() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const addChallengeRecord = useProgressStore(s => s.addChallengeRecord)
  const language = useUserStore(s => s.language)

  const [goal, setGoal] = useState<ChallengeGoal>(() => generateChallenge('beginner', language))
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [isRunning, setIsRunning] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [commandCount, setCommandCount] = useState(0)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<string[]>([])

  const { state, execute, reset } = useTmuxEngine()

  // Timer
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          setIsFailed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Check completion
  useEffect(() => {
    if (!isRunning || isComplete) return
    if (goal.validate(state)) {
      setIsRunning(false)
      setIsComplete(true)
      const challengeTime = TIME_LIMIT - timeLeft
      addChallengeRecord({
        difficulty: 'beginner',
        completedAt: new Date().toISOString(),
        timeSeconds: challengeTime,
        commandCount,
        targetDescription: goal.description,
      })
    }
  }, [state, goal, isRunning, isComplete, timeLeft, commandCount, addChallengeRecord])

  const handleCommand = useCallback((raw: string) => {
    const result = parser.parseInput(raw)
    if (isParseError(result)) {
      setOutput(prev => [...prev, `$ ${raw}`, `Error: ${result.message}`])
    } else {
      setOutput(prev => [...prev, `$ ${raw}`])
      execute(result)
      setCommandCount(c => c + 1)
    }
  }, [execute])

  useKeyCapture(
    useCallback((action) => {
      const result = parser.parseKeySequence('C-b', action.display)
      if (!isParseError(result)) {
        execute(result)
        setCommandCount(c => c + 1)
      }
    }, [execute]),
    isRunning
  )

  const handleSubmit = () => {
    if (!input.trim() || !isRunning) return
    handleCommand(input.trim())
    setInput('')
  }

  const handleRetry = () => {
    const newGoal = generateChallenge('beginner', language)
    setGoal(newGoal)
    reset()
    setTimeLeft(TIME_LIMIT)
    setIsRunning(true)
    setIsComplete(false)
    setIsFailed(false)
    setCommandCount(0)
    setOutput([])
    setInput('')
  }

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId)
  const activeWindow = activeSession?.windows[activeSession.activeWindowIndex]
  const isLastTen = timeLeft <= 10 && isRunning

  return (
    <div className="flex flex-col h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fff8eb 50%, #f0f4ff 100%)' }}>
      {/* Top Bar */}
      <div
        className="flex items-center justify-between glass"
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('challenge-select')}
          className="font-[family-name:var(--font-ui)] font-semibold text-sm cursor-pointer transition-all"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#64748b',
            border: '1px solid #e2e8f0',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          &larr; {t('common.back')}
        </button>

        {/* Timer pill */}
        <div
          className="font-[family-name:var(--font-pixel)] text-lg font-bold"
          style={{
            padding: '6px 20px',
            borderRadius: '9999px',
            background: isLastTen ? '#fef2f2' : '#dcfce7',
            color: isLastTen ? '#ef4444' : '#22c55e',
            border: isLastTen ? '1px solid #fecaca' : '1px solid #86efac',
            animation: isLastTen ? 'pulse-red 0.8s ease-in-out infinite' : 'none',
          }}
        >
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>

        <div
          className="font-[family-name:var(--font-ui)] text-sm font-semibold"
          style={{
            padding: '4px 14px',
            borderRadius: '9999px',
            background: 'rgba(14,165,233,0.08)',
            border: '1px solid rgba(14,165,233,0.2)',
            color: '#64748b',
          }}
        >
          CMD: <span style={{ color: '#0ea5e9', fontFamily: 'var(--font-pixel)' }}>{commandCount}</span>
        </div>
      </div>

      {/* Goal Description */}
      <div
        className="relative overflow-hidden"
        style={{
          margin: '12px 16px 0',
          padding: '12px 16px',
          borderRadius: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: 'linear-gradient(180deg, #fbbf24, #f59e0b)', borderRadius: '12px 0 0 12px' }}
        />
        <p
          className="font-[family-name:var(--font-ui)] text-sm"
          style={{ color: '#1e293b', paddingLeft: '8px' }}
        >
          {'\uD83C\uDFAF'} {goal.description}
        </p>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginTop: '12px' }}>
        {/* Terminal area - KEEP DARK */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            margin: '0 16px',
            borderRadius: '16px',
            border: '1px solid #334155',
            background: '#1e293b',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          }}
        >
          <div className="h-full" style={{ padding: '8px' }}>
            {activeWindow && <PaneRenderer tree={activeWindow.layoutTree} activePaneId={activeWindow.activePaneId} />}
          </div>
        </div>

        {activeSession && <TmuxStatusBar session={activeSession} />}

        {/* Command output - keep dark for terminal realism */}
        <div
          className="overflow-y-auto font-[family-name:var(--font-mono)] text-xs leading-relaxed"
          style={{
            height: '80px',
            margin: '8px 16px 0',
            padding: '8px 10px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
          }}
        >
          {output.length === 0 ? (
            <div
              className="h-full flex items-center justify-center"
              style={{ color: '#334155', fontSize: '0.75rem', letterSpacing: '0.05em' }}
            >
              {t('game.outputPlaceholder')}
            </div>
          ) : output.slice(-8).map((line, i) => {
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

        {/* Input - keep dark for terminal realism */}
        <div
          className="flex items-center font-[family-name:var(--font-mono)] text-sm"
          style={{
            margin: '8px 16px 12px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, #1e293b, #172033)',
            border: '1px solid #334155',
          }}
        >
          <span className="font-[family-name:var(--font-mono)] font-bold" style={{ marginRight: '8px', color: '#22c55e' }}>$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="flex-1 bg-transparent outline-none"
            style={{ color: '#e2e8f0', caretColor: '#22c55e' }}
            disabled={!isRunning}
            autoFocus
          />
        </div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {(isComplete || isFailed) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {/* Confetti for success */}
            {isComplete && Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={`confetti-${i}`}
                className="absolute"
                initial={{ opacity: 1, x: 0, y: 0, scale: Math.random() * 0.5 + 0.5 }}
                animate={{
                  opacity: [1, 1, 0],
                  x: (Math.random() - 0.5) * 500,
                  y: Math.random() * -300 - 100,
                  rotate: Math.random() * 720 - 360,
                }}
                transition={{
                  duration: 1.8 + Math.random() * 0.8,
                  delay: Math.random() * 0.4,
                  ease: [0.2, 0.8, 0.4, 1],
                }}
                style={{
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  background: ['#f59e0b', '#0ea5e9', '#ec4899', '#10b981', '#8b5cf6', '#f97316'][i % 6],
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
              className="text-center relative w-[400px] max-w-[90vw] rounded-3xl overflow-hidden shadow-2xl"
              style={{
                padding: '36px 40px 32px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              {/* Top accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{
                  background: isComplete
                    ? 'linear-gradient(90deg, #10b981, #0ea5e9, #8b5cf6)'
                    : 'linear-gradient(90deg, #ef4444, #f97316)',
                }}
              />

              {/* Emoji + Title */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-5xl mb-3">
                  {isComplete ? '\uD83C\uDF89' : '\u23F0'}
                </div>
                <h2
                  className="font-[family-name:var(--font-pixel)] text-xl mb-1"
                  style={{ color: isComplete ? '#059669' : '#dc2626' }}
                >
                  {isComplete ? t('challenge.completed') : t('challenge.timeUp')}
                </h2>
                <p className="font-[family-name:var(--font-ui)] text-xs text-slate-400 mb-6">
                  {goal.description}
                </p>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center mb-7 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div className="flex-1 text-center" style={{ padding: '16px 12px' }}>
                  <span className="text-lg block mb-1">{isComplete ? '\u23F1\uFE0F' : '\u26A0\uFE0F'}</span>
                  <div
                    className="font-[family-name:var(--font-pixel)] text-xl font-bold leading-none"
                    style={{ color: isComplete ? '#0ea5e9' : '#ef4444' }}
                  >
                    {TIME_LIMIT - timeLeft}s
                  </div>
                  <div className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1.5 tracking-wide">
                    {t('challenge.yourTime')}
                  </div>
                </div>
                <div className="w-px bg-slate-200 my-3" />
                <div className="flex-1 text-center" style={{ padding: '16px 12px' }}>
                  <span className="text-lg block mb-1">{'\u2328\uFE0F'}</span>
                  <div className="font-[family-name:var(--font-pixel)] text-xl font-bold text-sky-500 leading-none">
                    {commandCount}
                  </div>
                  <div className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1.5 tracking-wide">
                    {t('challenge.commandsUsed')}
                  </div>
                </div>
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex justify-center gap-3"
              >
                <button
                  onClick={() => setScreen('challenge-select')}
                  className="font-[family-name:var(--font-ui)] px-6 py-3 text-[13px] font-semibold rounded-2xl cursor-pointer transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                    border: '1.5px solid #e2e8f0',
                    color: '#64748b',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1'
                    e.currentTarget.style.color = '#475569'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.color = '#64748b'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  {t('challenge.backToMenu')}
                </button>
                <button
                  onClick={handleRetry}
                  className="font-[family-name:var(--font-ui)] font-bold px-7 py-3 text-[13px] rounded-2xl text-white border-none cursor-pointer transition-all duration-200"
                  style={{
                    background: isComplete
                      ? 'linear-gradient(135deg, #10b981, #0ea5e9)'
                      : 'linear-gradient(135deg, #f97316, #ef4444)',
                    boxShadow: isComplete
                      ? '0 4px 16px rgba(16, 185, 129, 0.35), 0 1px 3px rgba(14, 165, 233, 0.2)'
                      : '0 4px 16px rgba(239, 68, 68, 0.35), 0 1px 3px rgba(249, 115, 22, 0.2)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = isComplete
                      ? '0 8px 24px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(14, 165, 233, 0.25)'
                      : '0 8px 24px rgba(239, 68, 68, 0.4), 0 2px 6px rgba(249, 115, 22, 0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = isComplete
                      ? '0 4px 16px rgba(16, 185, 129, 0.35), 0 1px 3px rgba(14, 165, 233, 0.2)'
                      : '0 4px 16px rgba(239, 68, 68, 0.35), 0 1px 3px rgba(249, 115, 22, 0.2)'
                  }}
                >
                  🔄 {t('challenge.tryAgain')}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
