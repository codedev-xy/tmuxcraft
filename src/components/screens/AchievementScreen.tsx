import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { ACHIEVEMENTS } from '@/game/achievements'

// Map achievement IDs to a colored left-border accent for variety
function getAchievementAccent(index: number): string {
  const accents = ['#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1']
  return accents[index % accents.length]
}

export function AchievementScreen() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const unlockedAchievements = useProgressStore(s => s.achievements)

  const earnedCount = unlockedAchievements.length
  const totalCount = ACHIEVEMENTS.length
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Header */}
      <div
        className="flex items-center gap-4 shrink-0"
        style={{
          padding: '1rem 1.5rem',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={() => setScreen('home')}
          className="font-[family-name:var(--font-ui)] font-semibold cursor-pointer"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            color: '#1e293b',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#e2e8f0'
            el.style.borderColor = '#cbd5e1'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#f1f5f9'
            el.style.borderColor = '#e2e8f0'
          }}
        >
          &larr; {t('common.back')}
        </button>
        <h1 className="font-[family-name:var(--font-pixel)] text-xl" style={{ color: '#0ea5e9' }}>
          {t('achievements.title')}
        </h1>

        {/* Progress badge */}
        <div className="flex items-center gap-3" style={{ marginLeft: 'auto' }}>
          <div style={{
            width: '120px',
            height: '14px',
            background: '#e2e8f0',
            borderRadius: '7px',
            overflow: 'hidden',
          }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #22c55e)',
                borderRadius: '7px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <span
            className="font-[family-name:var(--font-ui)] font-bold text-sm rounded-full"
            style={{
              padding: '0.25rem 0.75rem',
              background: 'rgba(14,165,233,0.08)',
              color: '#0ea5e9',
              border: '1px solid rgba(14,165,233,0.2)',
            }}
          >
            {earnedCount} / {totalCount}
          </span>
        </div>
      </div>

      {/* Achievement grid */}
      <div
        className="flex-1 flex justify-center overflow-y-auto"
        style={{ padding: '1.5rem' }}
      >
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl w-full h-fit"
          style={{ gap: '1rem' }}
        >
          {ACHIEVEMENTS.map((achievement, i) => {
            const unlocked = unlockedAchievements.includes(achievement.id)
            const accentColor = getAchievementAccent(i)
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="text-center relative"
                style={{
                  padding: '1.25rem 1rem',
                  background: unlocked ? '#ffffff' : '#f8fafc',
                  border: unlocked
                    ? '1px solid #e2e8f0'
                    : '1px solid #e2e8f0',
                  borderLeft: unlocked
                    ? `3px solid ${accentColor}`
                    : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  boxShadow: unlocked
                    ? '0 2px 12px rgba(0,0,0,0.06)'
                    : 'none',
                  opacity: unlocked ? 1 : 0.6,
                  filter: unlocked ? 'none' : 'grayscale(1)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (unlocked) {
                    el.style.transform = 'translateY(-4px) scale(1.02)'
                    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'
                    el.style.borderColor = '#cbd5e1'
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (unlocked) {
                    el.style.transform = 'translateY(0) scale(1)'
                    el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                    el.style.borderColor = '#e2e8f0'
                  }
                }}
              >
                {/* Icon */}
                <span
                  className="text-4xl block"
                  style={{
                    marginBottom: '0.75rem',
                    filter: unlocked
                      ? `drop-shadow(0 2px 6px ${accentColor}40)`
                      : 'grayscale(1) opacity(0.4)',
                  }}
                >
                  {unlocked ? achievement.icon : '?'}
                </span>

                {/* Title */}
                <h3
                  className="text-sm font-[family-name:var(--font-pixel)] leading-snug"
                  style={{
                    color: unlocked ? '#1e293b' : '#94a3b8',
                  }}
                >
                  {unlocked ? t(achievement.titleKey) : '???'}
                </h3>

                {/* Description (only when unlocked) */}
                {unlocked && (
                  <p
                    className="text-xs font-[family-name:var(--font-ui)] line-clamp-2 leading-relaxed"
                    style={{
                      marginTop: '0.5rem',
                      color: '#64748b',
                    }}
                  >
                    {t(achievement.descriptionKey)}
                  </p>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
