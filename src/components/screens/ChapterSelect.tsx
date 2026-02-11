import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'

const CHAPTERS = [
  {
    id: 1,
    emoji: '\u{1F331}',
    total: 11,
    unlock: 0,
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    lightBg: '#f0f9ff',
  },
  {
    id: 2,
    emoji: '\u26A1',
    total: 8,
    unlock: 1,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
    lightBg: '#f5f3ff',
  },
  {
    id: 3,
    emoji: '\u{1F3A8}',
    total: 7,
    unlock: 2,
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
    lightBg: '#fdf2f8',
  },
]

export function ChapterSelect() {
  const { t } = useTranslation()
  const { setScreen, setChapter } = useGameStore()
  const chaptersCompleted = useProgressStore(s => s.chaptersCompleted)
  const getChapterProgress = useProgressStore(s => s.getChapterProgress)
  const levelProgress = useProgressStore(s => s.levelProgress)

  const isUnlocked = (chapter: typeof CHAPTERS[0]) =>
    chapter.unlock === 0 || chaptersCompleted.includes(chapter.unlock)

  const getTotalStars = (chapterId: number) => {
    return Object.entries(levelProgress).reduce((sum, [id, prog]) => {
      const [ch] = id.split('-')
      if (parseInt(ch) !== chapterId) return sum
      return sum + (prog.stars.completed ? 1 : 0) + (prog.stars.efficient ? 1 : 0) + (prog.stars.noHints ? 1 : 0)
    }, 0)
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f4ff' }}>
      {/* Header */}
      <div
        className="flex items-center shrink-0"
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
        <div className="flex flex-col">
          <h1
            className="font-[family-name:var(--font-pixel)] text-lg font-bold"
            style={{ color: '#1e293b' }}
          >
            {t('chapters.select')}
          </h1>
          <p
            className="font-[family-name:var(--font-ui)] text-xs"
            style={{ marginTop: '2px', color: '#64748b' }}
          >
            {t('chapters.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 flex items-center justify-center overflow-y-auto"
        style={{ padding: '24px' }}
      >
        <div
          className="flex flex-col lg:flex-row w-full max-w-6xl items-stretch"
          style={{ gap: '24px' }}
        >
          {CHAPTERS.map((chapter, i) => {
            const unlocked = isUnlocked(chapter)
            const progress = getChapterProgress(chapter.id)
            const pct = Math.round((progress.completed / progress.total) * 100)
            const stars = getTotalStars(chapter.id)
            const maxStars = chapter.total * 3
            const isCleared = pct === 100

            return (
              <motion.button
                key={chapter.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 100, damping: 14 }}
                whileHover={unlocked ? { y: -8, transition: { duration: 0.2 } } : {}}
                whileTap={unlocked ? { scale: 0.97 } : {}}
                onClick={() => {
                  if (unlocked) {
                    setChapter(chapter.id)
                    setScreen('level-select')
                  }
                }}
                className={`relative flex-1 flex flex-col items-center text-center overflow-hidden transition-all min-h-[320px] ${
                  unlocked
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed'
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
                {/* Colorful gradient header strip */}
                <div
                  className="w-full flex items-center justify-center relative"
                  style={{
                    height: '144px',
                    background: chapter.gradient,
                    borderRadius: '19px 19px 0 0',
                    opacity: unlocked ? 1 : 0.4,
                  }}
                >
                  {/* Light overlay for depth */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
                      borderRadius: '19px 19px 0 0',
                    }}
                  />
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <span className="text-6xl drop-shadow-lg">{chapter.emoji}</span>
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-[family-name:var(--font-pixel)] text-xl font-bold"
                      style={{
                        background: 'rgba(255, 255, 255, 0.25)',
                        border: '2px solid rgba(255,255,255,0.4)',
                      }}
                    >
                      {chapter.id}
                    </div>
                  </div>
                </div>

                {/* Lock overlay for locked cards */}
                {!unlocked && (
                  <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center"
                    style={{
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    <div
                      className="flex flex-col items-center"
                      style={{
                        padding: '16px 24px',
                        gap: '8px',
                        borderRadius: '16px',
                        background: '#ffffff',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <span className="text-5xl" style={{ color: '#94a3b8' }}>{'\u{1F512}'}</span>
                      <span
                        className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                        style={{ color: '#94a3b8' }}
                      >
                        {t('chapters.unlockPrevious')}
                      </span>
                    </div>
                  </div>
                )}

                {/* CLEAR badge */}
                {unlocked && isCleared && (
                  <motion.div
                    initial={{ scale: 0, rotate: -12 }}
                    animate={{ scale: 1, rotate: -12 }}
                    transition={{ type: 'spring', stiffness: 200, delay: i * 0.15 + 0.3 }}
                    className="absolute top-3 right-3 z-20 font-[family-name:var(--font-pixel)] text-white text-xs font-bold"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                    }}
                  >
                    {'\u{1F389}'} CLEAR!
                  </motion.div>
                )}

                {/* Card body */}
                <div
                  className="flex flex-col items-center flex-1 w-full"
                  style={{
                    padding: '20px 24px 24px',
                    opacity: unlocked ? 1 : 0.4,
                  }}
                >
                  {/* Title */}
                  <h3
                    className="font-[family-name:var(--font-pixel)] text-base lg:text-lg font-bold leading-snug"
                    style={{ marginBottom: '8px', color: '#1e293b' }}
                  >
                    {t(`chapters.chapter${chapter.id}.title`)}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-sm font-[family-name:var(--font-ui)] leading-relaxed flex-1"
                    style={{ marginBottom: '20px', padding: '0 8px', color: '#64748b' }}
                  >
                    {t(`chapters.chapter${chapter.id}.description`)}
                  </p>

                  {/* Stars */}
                  <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
                    <span className="text-lg" style={{ color: '#f59e0b' }}>
                      {'\u2B50'}
                    </span>
                    <span
                      className="font-[family-name:var(--font-pixel)] text-sm font-bold"
                      style={{ color: '#f59e0b' }}
                    >
                      {stars}
                    </span>
                    <span
                      className="font-[family-name:var(--font-ui)] text-sm"
                      style={{ color: '#94a3b8' }}
                    >
                      / {maxStars}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full" style={{ padding: '0 8px' }}>
                    <div
                      className="flex justify-between text-xs font-[family-name:var(--font-ui)] font-semibold"
                      style={{ marginBottom: '6px', color: '#64748b' }}
                    >
                      <span>{t('chapters.progress', { completed: progress.completed, total: progress.total })}</span>
                      <span style={{ color: chapter.color }}>{pct}%</span>
                    </div>
                    <div
                      className="w-full overflow-hidden"
                      style={{
                        height: '16px',
                        borderRadius: '9999px',
                        background: '#e2e8f0',
                      }}
                    >
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          borderRadius: '9999px',
                          background: chapter.gradient,
                        }}
                      />
                    </div>
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
