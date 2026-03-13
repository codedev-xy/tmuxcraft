import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { calculateStars } from '@/game/scoring'
import type { LevelDefinition } from '@/game/level-types'

interface CompletionModalProps {
  isVisible: boolean
  currentLevel: LevelDefinition
  commandCount: number
  hintsUsed: number
  onRetry: () => void
  onNextLevel: () => void
  hasNextLevel: boolean
}

const CONFETTI_COLORS = ['#f59e0b', '#0ea5e9', '#ec4899', '#10b981', '#8b5cf6', '#f97316']

export function CompletionModal({
  isVisible,
  currentLevel,
  commandCount,
  hintsUsed,
  onRetry,
  onNextLevel,
  hasNextLevel,
}: CompletionModalProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {isVisible && (() => {
        const stars = calculateStars(commandCount, currentLevel.optimalSteps, hintsUsed)
        const starCount = (stars.completed ? 1 : 0) + (stars.efficient ? 1 : 0) + (stars.noHints ? 1 : 0)
        const isPerfect = starCount === 3
        return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50 bg-slate-900/60 backdrop-blur-md"
        >
          {/* Confetti particles */}
          {Array.from({ length: isPerfect ? 24 : 12 }).map((_, i) => (
            <motion.div
              key={`confetti-${i}`}
              className="absolute"
              initial={{
                opacity: 1,
                x: 0, y: 0,
                scale: Math.random() * 0.5 + 0.5,
              }}
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
                background: CONFETTI_COLORS[i % 6],
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
            className="text-center relative w-[380px] max-w-[90vw] rounded-3xl overflow-hidden shadow-2xl"
            style={{
              padding: '36px 40px 32px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            }}
          >
            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: isPerfect
                  ? 'linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #0ea5e9, #10b981)'
                  : 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
              }}
            />

            {/* Title */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="font-[family-name:var(--font-pixel)] text-xl text-slate-900 mb-1">
                {t('game.levelComplete')}
              </h2>
              <p className="font-[family-name:var(--font-ui)] text-xs text-slate-400 mb-6">
                {currentLevel?.titleKey ? t(currentLevel.titleKey) : ''}
              </p>
            </motion.div>

            {/* Stars */}
            <div className="flex justify-center items-end gap-5 mb-6">
              {(['completed', 'efficient', 'noHints'] as const).map((key, i) => {
                const earned = key === 'completed' ? stars.completed : key === 'efficient' ? stars.efficient : stars.noHints
                return (
                  <motion.div
                    key={key}
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 400, damping: 15 }}
                    className="text-center w-[90px]"
                  >
                    <div className="relative inline-block mb-2">
                      {earned && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: [0.4, 0.7, 0.4], scale: 1 }}
                          transition={{ delay: 0.5 + i * 0.15, duration: 2, repeat: Infinity }}
                          className="absolute -inset-2 rounded-full"
                          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)' }}
                        />
                      )}
                      <span
                        className="block transition-all duration-300"
                        style={{
                          fontSize: earned ? '36px' : '28px',
                          filter: earned ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.4))' : 'grayscale(1)',
                          opacity: earned ? 1 : 0.25,
                        }}
                      >
                        {'\u2B50'}
                      </span>
                    </div>
                    <span
                      className={`font-[family-name:var(--font-ui)] block text-[11px] leading-tight ${
                        earned ? 'font-semibold text-slate-700' : 'font-normal text-slate-300'
                      }`}
                    >
                      {t(`game.stars.${key}`)}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex justify-center mb-7 bg-slate-100 rounded-xl py-2.5"
            >
              <div className="flex-1 text-center">
                <div className="font-[family-name:var(--font-mono)] text-lg font-bold text-sky-500">
                  {commandCount}
                </div>
                <div className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-0.5">
                  {t('game.commands')}
                </div>
              </div>
              <div className="w-px bg-slate-200 my-1" />
              <div className="flex-1 text-center">
                <div className="font-[family-name:var(--font-mono)] text-lg font-bold text-emerald-500">
                  {currentLevel.optimalSteps}
                </div>
                <div className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-0.5">
                  {t('game.optimal')}
                </div>
              </div>
              <div className="w-px bg-slate-200 my-1" />
              <div className="flex-1 text-center">
                <div className="font-[family-name:var(--font-mono)] text-lg font-bold text-amber-500">
                  {starCount}/3
                </div>
                <div className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-0.5">
                  {'\u2B50'}
                </div>
              </div>
            </motion.div>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center gap-2.5"
            >
              <button
                onClick={onRetry}
                className="font-[family-name:var(--font-ui)] px-6 py-2.5 text-[13px] font-medium bg-white border-[1.5px] border-slate-200 rounded-xl text-slate-500 cursor-pointer transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
              >
                {t('game.retry')}
              </button>
              <button
                onClick={onNextLevel}
                className="font-[family-name:var(--font-ui)] font-bold px-7 py-2.5 text-[13px] rounded-xl text-white border-none cursor-pointer transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(14, 165, 233, 0.35)' }}
              >
                {hasNextLevel ? t('game.nextLevel') : t('common.back')} {'\u2192'}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
        )
      })()}
    </AnimatePresence>
  )
}
