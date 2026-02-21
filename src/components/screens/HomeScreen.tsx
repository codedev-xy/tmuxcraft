import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useUserStore } from '@/store/user-store'
import { useProgressStore } from '@/store/progress-store'

// ─── Three main entries ───

const MAIN_CARDS = [
  {
    key: 'startGame',
    screen: 'chapter-select' as const,
    emoji: '\uD83D\uDCD6',
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    shadowBase: '0 6px 0 #0369a1, 0 8px 20px rgba(14, 165, 233, 0.25)',
    glowColor: 'rgba(14,165,233,0.3)',
    iconBg: 'rgba(14, 165, 233, 0.1)',
    titleColor: '#0284c7',
  },
  {
    key: 'challenge',
    screen: 'challenge-select' as const,
    emoji: '\uD83C\uDFAF',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    shadowBase: '0 6px 0 #b45309, 0 8px 20px rgba(245, 158, 11, 0.25)',
    glowColor: 'rgba(245,158,11,0.3)',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    titleColor: '#d97706',
  },
  {
    key: 'settings',
    screen: 'settings' as const,
    emoji: '\u2699\uFE0F',
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    shadowBase: '0 6px 0 #334155, 0 8px 20px rgba(100, 116, 139, 0.25)',
    glowColor: 'rgba(100,116,139,0.3)',
    iconBg: 'rgba(100, 116, 139, 0.1)',
    titleColor: '#475569',
  },
]

// ─── Main HomeScreen ───

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const { language, setLanguage } = useUserStore()
  const levelProgress = useProgressStore(s => s.levelProgress)
  const getChapterProgress = useProgressStore(s => s.getChapterProgress)

  // Compute player stats
  const totalCompleted = Object.values(levelProgress).filter(l => l.completed).length
  const totalStars = Object.values(levelProgress).reduce(
    (sum, l) =>
      sum + (l.stars.completed ? 1 : 0) + (l.stars.efficient ? 1 : 0) + (l.stars.noHints ? 1 : 0),
    0
  )
  const ch1 = getChapterProgress(1)
  const ch2 = getChapterProgress(2)
  const ch3 = getChapterProgress(3)

  return (
    <div
      className="flex flex-col h-screen w-full relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f0f4ff 100%)' }}
    >
      {/* ─── Decorative background blobs ─── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '-10%',
          left: '-5%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'float-slow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          bottom: '-8%',
          right: '-3%',
          width: '35%',
          height: '35%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float-slow 10s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: '40%',
          right: '15%',
          width: '20%',
          height: '20%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'gradient-shift 12s ease-in-out infinite',
        }}
      />
      {/* Dot pattern overlay */}
      <div className="absolute inset-0 bg-dots opacity-[0.03] pointer-events-none" />

      {/* ─── Top bar: stats + language toggle ─── */}
      <div
        className="relative z-10 flex items-center justify-between shrink-0"
        style={{ padding: '16px 24px 8px 24px' }}
      >
        {/* Player stats (left side) */}
        <div className="flex items-center gap-2 flex-wrap">
          {totalCompleted > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2"
            >
              <div
                className="flex items-center gap-1.5 rounded-full text-sm"
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #fde68a',
                  boxShadow: '0 1px 4px rgba(245, 158, 11, 0.08)',
                }}
              >
                <span className="text-sm">{'\u2B50'}</span>
                <span className="font-[family-name:var(--font-pixel)] font-semibold text-xs" style={{ color: '#f59e0b' }}>{totalStars}</span>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full text-sm"
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #bbf7d0',
                  boxShadow: '0 1px 4px rgba(34, 197, 94, 0.08)',
                }}
              >
                <span className="text-sm">{'\u2705'}</span>
                <span className="font-[family-name:var(--font-pixel)] font-semibold text-xs" style={{ color: '#22c55e' }}>{totalCompleted}/26</span>
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full text-sm"
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #ddd6fe',
                  boxShadow: '0 1px 4px rgba(139, 92, 246, 0.08)',
                }}
              >
                <span className="text-sm">{'\uD83D\uDCDA'}</span>
                <span className="font-[family-name:var(--font-pixel)] font-semibold text-xs" style={{ color: '#8b5cf6' }}>
                  Ch1 {ch1.completed}/{ch1.total}
                  {ch2.completed > 0 && <> {'\u00B7'} Ch2 {ch2.completed}/{ch2.total}</>}
                  {ch3.completed > 0 && <> {'\u00B7'} Ch3 {ch3.completed}/{ch3.total}</>}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Language toggle (right side) — segmented pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative flex rounded-full"
          style={{
            padding: '3px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Sliding indicator */}
          <motion.div
            className="absolute rounded-full"
            style={{
              top: '3px',
              bottom: '3px',
              width: 'calc(50% - 3px)',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
            }}
            animate={{ left: language === 'zh' ? '3px' : 'calc(50%)' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
          <button
            onClick={() => { setLanguage('zh'); i18n.changeLanguage('zh') }}
            className="relative z-10 rounded-full text-xs font-semibold font-[family-name:var(--font-ui)] cursor-pointer transition-colors duration-200"
            style={{
              padding: '5px 12px',
              background: 'transparent',
              border: 'none',
              color: language === 'zh' ? '#ffffff' : '#64748b',
            }}
          >
            {'\uD83C\uDDE8\uD83C\uDDF3'} {'\u4E2D\u6587'}
          </button>
          <button
            onClick={() => { setLanguage('en'); i18n.changeLanguage('en') }}
            className="relative z-10 rounded-full text-xs font-semibold font-[family-name:var(--font-ui)] cursor-pointer transition-colors duration-200"
            style={{
              padding: '5px 12px',
              background: 'transparent',
              border: 'none',
              color: language === 'en' ? '#ffffff' : '#64748b',
            }}
          >
            {'\uD83C\uDDEC\uD83C\uDDE7'} EN
          </button>
        </motion.div>
      </div>

      {/* ─── Main content ─── */}
      <div
        className="flex-1 relative z-10 flex flex-col items-center justify-center overflow-y-auto"
        style={{ padding: '0 24px' }}
      >
        {/* ─── Hero section ─── */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center w-full"
          style={{ paddingBottom: '32px' }}
        >
          {/* Title with gradient */}
          <h1
            className="text-6xl md:text-7xl lg:text-8xl font-[family-name:var(--font-pixel)] font-bold"
            style={{
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(14, 165, 233, 0.2))',
            }}
          >
            TmuxCraft
          </h1>

          {/* Subtitle */}
          <p
            className="font-[family-name:var(--font-ui)] text-xl md:text-2xl font-medium"
            style={{ color: '#64748b' }}
          >
            {t('app.subtitle')}
          </p>
        </motion.div>

        {/* ─── Three equal entry cards ─── */}
        <div
          className="grid grid-cols-3 gap-5 lg:gap-6 max-w-4xl mx-auto w-full"
          style={{ paddingBottom: '24px' }}
        >
          {MAIN_CARDS.map((item, i) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 150 }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setScreen(item.screen)}
              className="rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer border-0 relative overflow-hidden"
              style={{
                padding: '36px 24px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 32px ${item.glowColor}`
                e.currentTarget.style.borderColor = `${item.glowColor}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            >
              {/* Emoji with circle background */}
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{ background: item.iconBg }}
              >
                <span className="text-6xl lg:text-7xl">{item.emoji}</span>
              </div>

              {/* Title */}
              <span
                className="font-[family-name:var(--font-pixel)] text-2xl font-bold"
                style={{ color: item.titleColor }}
              >
                {t(`home.${item.key}`)}
              </span>

              {/* Arrow indicator */}
              <span className="text-lg font-[family-name:var(--font-ui)]" style={{ color: '#94a3b8' }}>{'\u2192'}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
