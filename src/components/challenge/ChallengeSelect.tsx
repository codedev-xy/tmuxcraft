import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'
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
  const isChallengeUnlocked = useProgressStore(s => s.isChallengeUnlocked)
  const language = useUserStore(s => s.language)

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Header */}
      <div
        className="flex items-center"
        style={{
          padding: '16px 24px',
          gap: '16px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
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
        <h1
          className="font-[family-name:var(--font-pixel)] text-xl font-bold"
          style={{ color: '#1e293b' }}
        >
          {t('challenge.title')}
        </h1>
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        style={{ padding: '32px' }}
      >
        <div
          className="flex flex-col md:flex-row max-w-5xl w-full"
          style={{ gap: '24px' }}
        >
          {DIFFICULTIES.map((diff, i) => {
            const unlocked = isChallengeUnlocked(diff.key)
            return (
              <motion.button
                key={diff.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12, type: 'spring', stiffness: 200 }}
                whileHover={unlocked ? { y: -8, scale: 1.03 } : {}}
                disabled={!unlocked}
                onClick={() => { if (unlocked) setScreen('challenge') }}
                className={`relative flex-1 flex flex-col items-center text-center overflow-hidden transition-all min-h-[280px] ${
                  unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                style={{
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: unlocked
                    ? '0 2px 12px rgba(0,0,0,0.06)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Colored top accent strip */}
                <div
                  className="w-full"
                  style={{
                    height: '6px',
                    background: diff.gradient,
                    borderRadius: '19px 19px 0 0',
                    opacity: unlocked ? 1 : 0.3,
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

                {/* Lock overlay */}
                {!unlocked && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <span className="text-6xl" style={{ marginBottom: '12px', color: '#94a3b8' }}>{'\uD83D\uDD12'}</span>
                    <p
                      className="font-[family-name:var(--font-ui)] text-base font-semibold"
                      style={{ color: '#94a3b8' }}
                    >
                      {language === 'zh' ? `\u5B8C\u6210\u7B2C ${diff.chapter} \u7AE0\u89E3\u9501` : `Complete Chapter ${diff.chapter}`}
                    </p>
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
