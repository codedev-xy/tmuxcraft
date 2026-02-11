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
  const checkContextAchievements = useProgressStore(s => s.checkContextAchievements)
  const username = useUserStore(s => s.username)

  const [goal, setGoal] = useState<ChallengeGoal>(() => generateChallenge('beginner'))
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
        username,
        difficulty: 'beginner',
        completedAt: new Date().toISOString(),
        timeSeconds: challengeTime,
        commandCount,
        targetDescription: goal.description,
      })
      checkContextAchievements({ challengeTime })
    }
  }, [state, goal, isRunning, isComplete, timeLeft, commandCount, username, addChallengeRecord, checkContextAchievements])

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
    const newGoal = generateChallenge('beginner')
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
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Top Bar */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('challenge-select')}
          className="font-[family-name:var(--font-ui)] font-semibold text-sm"
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            background: '#f0f4ff',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
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

        <span
          className="font-[family-name:var(--font-ui)] text-sm font-semibold"
          style={{ color: '#64748b' }}
        >
          CMD: <span style={{ color: '#0ea5e9' }}>{commandCount}</span>
        </span>
      </div>

      {/* Goal Description */}
      <div
        style={{
          margin: '12px 16px 0',
          padding: '12px 16px',
          borderRadius: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <p
          className="font-[family-name:var(--font-ui)] text-sm"
          style={{ color: '#1e293b' }}
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
          className="overflow-y-auto font-[family-name:var(--font-mono)] text-xs"
          style={{
            height: '80px',
            margin: '8px 16px 0',
            padding: '12px',
            borderRadius: '12px',
            background: '#1e293b',
            border: '1px solid #334155',
          }}
        >
          {output.slice(-8).map((line, i) => (
            <div
              key={i}
              style={{
                color: line.startsWith('Error') ? '#ef4444' : '#94a3b8',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Input - keep dark for terminal realism */}
        <div
          className="flex items-center font-[family-name:var(--font-mono)] text-sm"
          style={{
            margin: '8px 16px 12px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: '#1e293b',
            border: '1px solid #334155',
          }}
        >
          <span style={{ marginRight: '8px', color: '#0ea5e9', fontWeight: 'bold' }}>$</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="flex-1 bg-transparent outline-none"
            style={{ color: '#e2e8f0' }}
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
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="text-center"
              style={{
                padding: '32px',
                maxWidth: '400px',
                width: '100%',
                margin: '0 16px',
                borderRadius: '20px',
                background: '#ffffff',
                border: isComplete
                  ? '2px solid #22c55e'
                  : '2px solid #ef4444',
                boxShadow: isComplete
                  ? '0 8px 48px rgba(34, 197, 94, 0.15), 0 2px 12px rgba(0,0,0,0.08)'
                  : '0 8px 48px rgba(239, 68, 68, 0.15), 0 2px 12px rgba(0,0,0,0.08)',
              }}
            >
              {/* Emoji header */}
              <div className="text-5xl" style={{ marginBottom: '12px' }}>
                {isComplete ? '\uD83C\uDF89' : '\uD83D\uDE14'}
              </div>

              <h2
                className="font-[family-name:var(--font-pixel)] text-xl"
                style={{
                  marginBottom: '16px',
                  color: isComplete ? '#22c55e' : '#ef4444',
                }}
              >
                {isComplete ? t('challenge.completed') : t('challenge.timeUp')}
              </h2>

              {isComplete && (
                <div className="flex justify-center" style={{ gap: '12px', marginBottom: '24px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      flex: 1,
                      background: '#f0f4ff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <p
                      className="font-[family-name:var(--font-ui)] text-xs"
                      style={{ marginBottom: '4px', color: '#94a3b8' }}
                    >
                      {t('challenge.yourTime')}
                    </p>
                    <p
                      className="font-[family-name:var(--font-pixel)] text-lg"
                      style={{ color: '#0ea5e9' }}
                    >
                      {TIME_LIMIT - timeLeft}s
                    </p>
                  </div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      flex: 1,
                      background: '#f0f4ff',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <p
                      className="font-[family-name:var(--font-ui)] text-xs"
                      style={{ marginBottom: '4px', color: '#94a3b8' }}
                    >
                      {t('challenge.commandsUsed')}
                    </p>
                    <p
                      className="font-[family-name:var(--font-pixel)] text-lg"
                      style={{ color: '#0ea5e9' }}
                    >
                      {commandCount}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-center" style={{ gap: '12px' }}>
                <button
                  onClick={() => setScreen('challenge-select')}
                  className="font-[family-name:var(--font-ui)] font-semibold text-sm"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: '#f0f4ff',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {t('challenge.backToMenu')}
                </button>
                <button
                  onClick={handleRetry}
                  className="font-[family-name:var(--font-ui)] font-semibold text-sm text-white"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: '#0ea5e9',
                    border: '1px solid #0ea5e9',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                  }}
                >
                  {t('challenge.tryAgain')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
