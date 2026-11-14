import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { TerminalView } from '@/components/game/TerminalView'
import { Confetti } from '@/components/ui/Confetti'
import { useTmuxSession } from '@/hooks/useTmuxSession'
import { defaultState } from '@/core/state'
import type { InputResult } from '@/game/sim/simulate'
import { generateChallenge } from '@/game/challenge/challenge-generator'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'
import type { ChallengeGoal } from '@/game/level-types'

const TIME_LIMIT = 60

/** The challenge screen. Every round gets a new goal, clock and terminal. */
export function ChallengeScreen() {
  const [round, setRound] = useState(0)
  return <ChallengeRound key={round} onRetry={() => setRound(count => count + 1)} />
}

function ChallengeRound({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const addChallengeRecord = useProgressStore(s => s.addChallengeRecord)
  const language = useUserStore(s => s.language)

  const [goal] = useState<ChallengeGoal>(() => generateChallenge('beginner', language))
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT)
  const [isComplete, setIsComplete] = useState(false)
  const [commandCount, setCommandCount] = useState(0)

  const session = useTmuxSession(defaultState)

  const isFailed = timeLeft === 0 && !isComplete
  const isRunning = timeLeft > 0 && !isComplete

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => setTimeLeft(left => Math.max(0, left - 1)), 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  const handleResult = (result: InputResult) => {
    if (!result.counted) return
    const count = commandCount + 1
    setCommandCount(count)
    if (!goal.validate(result.state)) return
    setIsComplete(true)
    addChallengeRecord({
      difficulty: 'beginner',
      completedAt: new Date().toISOString(),
      timeSeconds: TIME_LIMIT - timeLeft,
      commandCount: count,
      targetDescription: goal.description,
    })
  }

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
          CMD: <span data-testid="command-count" style={{ color: '#0ea5e9', fontFamily: 'var(--font-pixel)' }}>{commandCount}</span>
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

      {/* Terminal */}
      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{
          margin: '12px 16px',
          borderRadius: '16px',
          border: '1px solid #334155',
          background: '#1e293b',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        }}
      >
        <TerminalView session={session} onResult={handleResult} disabled={!isRunning} />
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
            {isComplete && <Confetti count={18} />}

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
                  onClick={onRetry}
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
