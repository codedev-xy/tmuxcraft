import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { chapter1Levels } from '@/game/levels/chapter1'
import { chapter2Levels } from '@/game/levels/chapter2'
import { chapter3Levels } from '@/game/levels/chapter3'

const CHAPTER_META: Record<number, { emoji: string; color: string; gradient: string; lightBg: string }> = {
  1: { emoji: '\u{1F331}', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)', lightBg: '#f0f9ff' },
  2: { emoji: '\u26A1', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', lightBg: '#f5f3ff' },
  3: { emoji: '\u{1F3A8}', color: '#ec4899', gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', lightBg: '#fdf2f8' },
}

export function LevelSelect() {
  const { t } = useTranslation()
  const { currentChapter, setScreen, startLevel } = useGameStore()
  const { levelProgress, isLevelUnlocked, getChapterProgress } = useProgressStore()

  const levels = currentChapter === 1 ? chapter1Levels : currentChapter === 2 ? chapter2Levels : chapter3Levels
  const progress = getChapterProgress(currentChapter)
  const pct = Math.round((progress.completed / progress.total) * 100)
  const meta = CHAPTER_META[currentChapter]

  const totalStars = Object.entries(levelProgress).reduce((sum, [id, prog]) => {
    const [ch] = id.split('-')
    if (parseInt(ch) !== currentChapter) return sum
    return sum + (prog.stars.completed ? 1 : 0) + (prog.stars.efficient ? 1 : 0) + (prog.stars.noHints ? 1 : 0)
  }, 0)
  const maxStars = levels.length * 3

  const getStarCount = (prog: { stars: { completed: boolean; efficient: boolean; noHints: boolean } }) => {
    return (prog.stars.completed ? 1 : 0) + (prog.stars.efficient ? 1 : 0) + (prog.stars.noHints ? 1 : 0)
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Two-panel layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left sidebar */}
        <div
          className="lg:w-[28%] shrink-0 flex flex-col items-center justify-center relative overflow-hidden"
          style={{
            padding: '24px',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
          }}
        >
          {/* Decorative colored circle, top-left */}
          <div
            className="absolute rounded-full"
            style={{
              top: '-40px',
              left: '-40px',
              width: '160px',
              height: '160px',
              background: `radial-gradient(circle, ${meta.color}15 0%, transparent 70%)`,
            }}
          />
          {/* Decorative colored circle, bottom-right */}
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-32px',
              right: '-32px',
              width: '128px',
              height: '128px',
              background: `radial-gradient(circle, ${meta.color}10 0%, transparent 70%)`,
            }}
          />

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center w-full max-w-xs relative z-10"
          >
            {/* Back button */}
            <button
              onClick={() => setScreen('chapter-select')}
              className="absolute left-0 font-semibold font-[family-name:var(--font-ui)] transition-colors"
              style={{
                top: '-8px',
                padding: '6px 12px',
                fontSize: '14px',
                borderRadius: '12px',
                background: '#f0f4ff',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
              }}
            >
              &larr; {t('common.back')}
            </button>

            {/* Chapter emoji */}
            <div style={{ fontSize: '3rem', marginBottom: '12px', marginTop: '32px' }}>{meta.emoji}</div>

            {/* Chapter number badge */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto font-[family-name:var(--font-pixel)] text-2xl font-bold text-white"
              style={{
                marginBottom: '16px',
                background: meta.gradient,
                boxShadow: `0 4px 16px ${meta.color}33`,
              }}
            >
              {currentChapter}
            </div>

            {/* Chapter title */}
            <h2
              className="font-[family-name:var(--font-pixel)] text-lg font-bold"
              style={{
                marginBottom: '12px',
                color: meta.color,
              }}
            >
              {t(`chapters.chapter${currentChapter}.title`)}
            </h2>

            {/* Chapter description */}
            <p
              className="text-base font-[family-name:var(--font-ui)] leading-relaxed"
              style={{ marginBottom: '24px', color: '#64748b' }}
            >
              {t(`chapters.chapter${currentChapter}.description`)}
            </p>

            {/* Stars count */}
            <div
              className="flex items-center justify-center gap-2"
              style={{ marginBottom: '20px' }}
            >
              <span className="text-lg" style={{ color: '#f59e0b' }}>
                {'\u2B50'}
              </span>
              <span
                className="font-[family-name:var(--font-pixel)] text-sm font-bold"
                style={{ color: '#f59e0b' }}
              >
                {totalStars}
              </span>
              <span
                className="font-[family-name:var(--font-ui)] text-sm"
                style={{ color: '#94a3b8' }}
              >
                / {maxStars}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <div
                className="flex justify-between text-xs font-[family-name:var(--font-ui)] font-semibold"
                style={{ marginBottom: '6px', color: '#64748b' }}
              >
                <span>{t('chapters.progress', { completed: progress.completed, total: progress.total })}</span>
                <span style={{ color: meta.color }}>{pct}%</span>
              </div>
              <div
                className="overflow-hidden"
                style={{
                  height: '14px',
                  borderRadius: '9999px',
                  background: '#e2e8f0',
                }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    borderRadius: '9999px',
                    background: meta.gradient,
                  }}
                />
              </div>
            </div>

            {pct === 100 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="font-[family-name:var(--font-pixel)] text-sm font-bold"
                style={{
                  marginTop: '20px',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  color: '#22c55e',
                  border: '1px solid #bbf7d0',
                }}
              >
                {'\u{1F389}'} ALL CLEAR!
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Right main area - level grid */}
        <div
          className="flex-1 overflow-y-auto flex items-start lg:items-center justify-center"
          style={{ padding: '24px' }}
        >
          <div
            className="grid grid-cols-2 lg:grid-cols-3 w-full max-w-3xl"
            style={{ gap: '20px' }}
          >
            {levels.map((level, i) => {
              const unlocked = isLevelUnlocked(level.id)
              const prog = levelProgress[level.id]
              const completed = prog?.completed
              const starCount = prog ? getStarCount(prog) : 0

              // Card styles by state
              const cardBg = completed ? '#f0fdf4' : unlocked ? '#ffffff' : '#f8fafc'
              const cardBorder = completed
                ? '1px solid #bbf7d0'
                : unlocked
                  ? `2px solid ${meta.color}`
                  : '1px solid #e2e8f0'
              const cardShadow = completed
                ? '0 2px 12px rgba(34, 197, 94, 0.1)'
                : unlocked
                  ? `0 2px 12px ${meta.color}18`
                  : '0 1px 4px rgba(0,0,0,0.04)'

              // Badge background by state
              const badgeBg = completed
                ? '#22c55e'
                : unlocked
                  ? meta.color
                  : '#cbd5e1'

              return (
                <motion.button
                  key={level.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 120, damping: 14 }}
                  whileHover={unlocked ? { y: -6, transition: { duration: 0.15 } } : {}}
                  whileTap={unlocked ? { scale: 0.96 } : {}}
                  onClick={() => { if (unlocked) startLevel(level) }}
                  className={`relative text-left transition-all min-h-[100px] flex items-stretch ${
                    unlocked ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                  style={{
                    borderRadius: '16px',
                    background: cardBg,
                    border: cardBorder,
                    boxShadow: cardShadow,
                    opacity: unlocked ? 1 : 0.6,
                  }}
                >
                  <div
                    className="flex flex-col justify-between w-full"
                    style={{
                      padding: '20px',
                    }}
                  >
                    {/* Top row: badge + status */}
                    <div className="flex items-start justify-between" style={{ marginBottom: '12px' }}>
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-[family-name:var(--font-pixel)] text-sm font-bold text-white shrink-0"
                        style={{
                          background: badgeBg,
                        }}
                      >
                        {!unlocked ? (
                          <span className="text-lg">{'\u{1F512}'}</span>
                        ) : (
                          i + 1
                        )}
                      </div>

                      {/* Star display for completed levels */}
                      {completed && prog && (
                        <div className="flex items-center gap-0.5">
                          {starCount > 0 && (
                            <span
                              className="font-[family-name:var(--font-pixel)] text-sm font-bold"
                              style={{
                                marginRight: '4px',
                                color: '#f59e0b',
                              }}
                            >
                              {starCount}
                            </span>
                          )}
                          <span
                            className="text-base"
                            style={{ color: prog.stars.completed ? '#f59e0b' : '#cbd5e1' }}
                          >
                            {prog.stars.completed ? '\u2605' : '\u2606'}
                          </span>
                          <span
                            className="text-base"
                            style={{ color: prog.stars.efficient ? '#f59e0b' : '#cbd5e1' }}
                          >
                            {prog.stars.efficient ? '\u2605' : '\u2606'}
                          </span>
                          <span
                            className="text-base"
                            style={{ color: prog.stars.noHints ? '#f59e0b' : '#cbd5e1' }}
                          >
                            {prog.stars.noHints ? '\u2605' : '\u2606'}
                          </span>
                        </div>
                      )}

                      {/* Check mark for completed */}
                      {completed && (
                        <span style={{ marginLeft: '4px', color: '#22c55e', fontSize: '18px' }}>{'\u2713'}</span>
                      )}
                    </div>

                    {/* Level title */}
                    <h3
                      className="text-sm font-[family-name:var(--font-pixel)] font-bold leading-snug min-h-[2.4em]"
                      style={{ marginBottom: '8px', color: '#1e293b' }}
                    >
                      {t(level.titleKey)}
                    </h3>

                    {/* Optimal steps info for available/completed levels */}
                    {unlocked && (
                      <span
                        className="text-xs font-[family-name:var(--font-ui)] font-semibold"
                        style={{ color: '#94a3b8' }}
                      >
                        {t('game.optimal')}: {level.optimalSteps} {t('game.stepsShort')}
                      </span>
                    )}

                    {/* Spacer for locked levels */}
                    {!unlocked && <div style={{ height: '16px' }} />}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
