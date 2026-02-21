import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import type { ChallengeDifficulty } from '@/game/level-types'

const DIFFICULTIES: {
  key: ChallengeDifficulty
  chapter: number
  timeLimit: number
  emoji: string
  color: string
  gradient: string
}[] = [
  {
    key: 'beginner',
    chapter: 1,
    timeLimit: 60,
    emoji: '\uD83C\uDF31',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #4ade80, #22c55e)',
  },
  {
    key: 'intermediate',
    chapter: 2,
    timeLimit: 90,
    emoji: '\u26A1',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  },
  {
    key: 'advanced',
    chapter: 3,
    timeLimit: 120,
    emoji: '\uD83D\uDD25',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #f87171, #ef4444)',
  },
]

export function ChallengeSelect() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)

  return (
    <div className="flex flex-col h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fff5eb 50%, #f0f4ff 100%)' }}>
      {/* ─── Decorative background blobs ─── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '-8%',
          right: '-5%',
          width: '32%',
          height: '32%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float-slow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: '-6%',
          left: '-3%',
          width: '25%',
          height: '25%',
          background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'float-slow 11s ease-in-out infinite reverse',
        }}
      />
      <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <div
        className="flex items-center gap-4 relative z-10 glass"
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
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
        <h1
          className="font-[family-name:var(--font-pixel)] text-xl font-bold"
          style={{ color: '#f59e0b' }}
        >
          {'\uD83C\uDFAF'} {t('challenge.title')}
        </h1>
      </div>

      <div
        className="flex-1 flex items-center justify-center relative z-10"
        style={{ padding: '32px' }}
      >
        <div
          className="flex flex-col md:flex-row max-w-5xl w-full"
          style={{ gap: '24px' }}
        >
          {DIFFICULTIES.map((diff, i) => {
            return (
              <motion.button
                key={diff.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 200 }}
                whileHover={{ y: -8, scale: 1.03 }}
                onClick={() => setScreen('challenge')}
                className="relative flex-1 flex flex-col items-center text-center overflow-hidden transition-all min-h-[280px] cursor-pointer"
                style={{
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = `0 8px 32px ${diff.color}25`
                  e.currentTarget.style.borderColor = `${diff.color}40`
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                {/* Colored top accent strip */}
                <div
                  className="w-full"
                  style={{
                    height: '6px',
                    background: diff.gradient,
                    borderRadius: '19px 19px 0 0',
                  }}
                />

                <div
                  className="flex flex-col items-center flex-1 justify-center"
                  style={{ padding: '32px', gap: '16px' }}
                >
                  {/* Emoji */}
                  <span className="text-7xl">{diff.emoji}</span>

                  {/* Difficulty name */}
                  <h3
                    className="font-[family-name:var(--font-pixel)] text-2xl font-bold"
                    style={{ color: diff.color }}
                  >
                    {t(`challenge.${diff.key}`)}
                  </h3>

                  {/* Description */}
                  <p
                    className="font-[family-name:var(--font-ui)] text-base leading-relaxed"
                    style={{ color: '#64748b' }}
                  >
                    {t(`challenge.${diff.key}Desc`)}
                  </p>

                  {/* Time limit */}
                  <div
                    className="flex items-center gap-2 font-[family-name:var(--font-ui)] text-base"
                    style={{
                      marginTop: '8px',
                      padding: '8px 20px',
                      borderRadius: '9999px',
                      background: '#f0f4ff',
                      border: '1px solid #e2e8f0',
                      color: '#64748b',
                    }}
                  >
                    <span>{'\u23F1\uFE0F'}</span>
                    <span
                      className="font-[family-name:var(--font-pixel)] font-semibold"
                      style={{ color: diff.color }}
                    >
                      {diff.timeLimit}s
                    </span>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
