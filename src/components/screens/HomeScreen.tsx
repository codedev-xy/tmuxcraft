import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/store/game-store'
import { useUserStore } from '@/store/user-store'
import { useProgressStore } from '@/store/progress-store'

// ─── Menu items (light playful theme) ───

const MENU_CARDS = [
  {
    key: 'achievements',
    screen: 'achievements' as const,
    emoji: '\uD83C\uDFC6',
    borderTopColor: '#f59e0b',
    hoverBorderColor: '#fbbf24',
    hoverShadow: '0 8px 24px rgba(245, 158, 11, 0.15)',
    iconBg: 'rgba(245, 158, 11, 0.08)',
    titleColor: '#d97706',
  },
  {
    key: 'reference',
    screen: 'reference' as const,
    emoji: '\uD83D\uDCD6',
    borderTopColor: '#0ea5e9',
    hoverBorderColor: '#38bdf8',
    hoverShadow: '0 8px 24px rgba(14, 165, 233, 0.15)',
    iconBg: 'rgba(14, 165, 233, 0.08)',
    titleColor: '#0284c7',
  },
  {
    key: 'settings',
    screen: 'settings' as const,
    emoji: '\u2699\uFE0F',
    borderTopColor: '#64748b',
    hoverBorderColor: '#94a3b8',
    hoverShadow: '0 8px 24px rgba(100, 116, 139, 0.15)',
    iconBg: 'rgba(100, 116, 139, 0.08)',
    titleColor: '#475569',
  },
]

// ─── Main HomeScreen ───

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const {
    username,
    isFirstVisit,
    setUsername,
    generateRandomUsername,
    completeFirstVisit,
    language,
    setLanguage,
  } = useUserStore()
  const levelProgress = useProgressStore(s => s.levelProgress)
  const getChapterProgress = useProgressStore(s => s.getChapterProgress)

  const [showWelcome, setShowWelcome] = useState(isFirstVisit)
  const [nameInput, setNameInput] = useState('')

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

  const handleStartWelcome = () => {
    const name = nameInput.trim() || generateRandomUsername()
    setUsername(name)
    completeFirstVisit()
    setShowWelcome(false)
  }

  const handleLanguageToggle = () => {
    const newLang = language === 'zh' ? 'en' : 'zh'
    setLanguage(newLang)
    i18n.changeLanguage(newLang)
  }

  return (
    <div
      className="flex flex-col h-screen w-full relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 50%, #f0f4ff 100%)' }}
    >
      {/* ─── Top bar: greeting + language toggle ─── */}
      <div
        className="relative z-10 flex items-center justify-between shrink-0"
        style={{ padding: '20px 24px 8px 24px' }}
      >
        {username && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p
                className="font-[family-name:var(--font-ui)] text-sm"
                style={{ color: '#64748b' }}
              >
                {language === 'zh' ? '\u6B22\u8FCE\u56DE\u6765\uFF0C' : 'Welcome back,'}
              </p>
              <p
                className="font-[family-name:var(--font-pixel)] text-lg font-semibold"
                style={{ color: '#1e293b' }}
              >
                {username}
              </p>
            </div>
          </motion.div>
        )}
        {!username && <div />}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={handleLanguageToggle}
          className="rounded-full text-sm font-semibold font-[family-name:var(--font-ui)] cursor-pointer transition-all"
          style={{
            padding: '8px 16px',
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#bae6fd'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {language === 'zh' ? '\uD83C\uDDEC\uD83C\uDDE7 EN' : '\uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u6587'}
        </motion.button>
      </div>

      {/* ─── Player stats bar (if progress exists) ─── */}
      {totalCompleted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 flex items-center gap-3 flex-wrap"
          style={{ padding: '0 24px 12px 24px' }}
        >
          <div
            className="flex items-center gap-1.5 rounded-full text-sm"
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #fde68a',
              boxShadow: '0 1px 4px rgba(245, 158, 11, 0.08)',
            }}
          >
            <span className="text-base">{'\u2B50'}</span>
            <span className="font-[family-name:var(--font-pixel)] font-semibold" style={{ color: '#f59e0b' }}>{totalStars}</span>
            <span className="text-xs" style={{ color: '#64748b' }}>{language === 'zh' ? '\u661F\u661F' : 'Stars'}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full text-sm"
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              boxShadow: '0 1px 4px rgba(34, 197, 94, 0.08)',
            }}
          >
            <span className="text-base">{'\u2705'}</span>
            <span className="font-[family-name:var(--font-pixel)] font-semibold" style={{ color: '#22c55e' }}>{totalCompleted}/26</span>
            <span className="text-xs" style={{ color: '#64748b' }}>{language === 'zh' ? '\u5173\u5361' : 'Levels'}</span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-full text-sm"
            style={{
              padding: '6px 12px',
              background: '#ffffff',
              border: '1px solid #ddd6fe',
              boxShadow: '0 1px 4px rgba(139, 92, 246, 0.08)',
            }}
          >
            <span className="text-base">{'\uD83D\uDCDA'}</span>
            <span className="font-[family-name:var(--font-pixel)] font-semibold" style={{ color: '#8b5cf6' }}>
              Ch1 {ch1.completed}/{ch1.total}
              {ch2.completed > 0 && <> {'\u00B7'} Ch2 {ch2.completed}/{ch2.total}</>}
              {ch3.completed > 0 && <> {'\u00B7'} Ch3 {ch3.completed}/{ch3.total}</>}
            </span>
          </div>
        </motion.div>
      )}

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
          style={{ paddingBottom: '8px' }}
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
            style={{ marginBottom: '32px', color: '#64748b' }}
          >
            {t('app.subtitle')}
          </p>

          {/* ─── Two primary CTA buttons side by side ─── */}
          <div className="flex justify-center gap-6">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setScreen('chapter-select')}
              className="rounded-2xl font-[family-name:var(--font-pixel)] text-xl font-bold cursor-pointer border-0 relative overflow-hidden"
              style={{
                padding: '20px 48px',
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                boxShadow: '0 6px 0 #0369a1, 0 8px 20px rgba(14, 165, 233, 0.25)',
                color: '#ffffff',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">{'\uD83D\uDCD6'}</span>
                {t('home.startGame')}
              </span>
              <div className="absolute inset-0 opacity-30 shimmer" />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setScreen('challenge-select')}
              className="rounded-2xl font-[family-name:var(--font-pixel)] text-xl font-bold cursor-pointer border-0 relative overflow-hidden"
              style={{
                padding: '20px 48px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 6px 0 #b45309, 0 8px 20px rgba(245, 158, 11, 0.25)',
                color: '#ffffff',
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl">{'\uD83C\uDFAF'}</span>
                {t('home.challenge')}
              </span>
              <div className="absolute inset-0 opacity-30 shimmer" />
            </motion.button>
          </div>
        </motion.div>

        {/* ─── Menu cards grid ─── */}
        <div
          className="grid grid-cols-3 gap-4 lg:gap-5 max-w-4xl mx-auto w-full"
          style={{ paddingBottom: '24px' }}
        >
          {MENU_CARDS.map((item, i) => (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 150 }}
              whileHover={{
                scale: 1.04,
                y: -3,
              }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setScreen(item.screen)}
              className="rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
              style={{
                padding: '24px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: `4px solid ${item.borderTopColor}`,
                borderRadius: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = item.hoverShadow
                e.currentTarget.style.borderColor = item.hoverBorderColor
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                e.currentTarget.style.borderColor = '#e2e8f0'
              }}
            >
              {/* Emoji with circle background */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: item.iconBg }}
              >
                <span className="text-5xl lg:text-6xl">{item.emoji}</span>
              </div>

              {/* Title */}
              <span
                className="font-[family-name:var(--font-pixel)] text-xl font-bold"
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

      {/* ─── Welcome Modal ─── */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
          >
            {/* Subtle decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #bae6fd, transparent 70%)' }} />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ddd6fe, transparent 70%)' }} />
              <div className="absolute top-1/4 right-1/4 w-40 h-40 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #fbcfe8, transparent 70%)' }} />
            </div>

            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative max-w-xl w-full text-center"
              style={{
                margin: '0 16px',
                padding: '3.5rem 3rem',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '28px',
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.12), 0 4px 24px rgba(0, 0, 0, 0.06)',
              }}
            >
              {/* Floating welcome emoji */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="text-8xl animate-float"
                style={{ marginBottom: '1.5rem' }}
              >
                {'\uD83D\uDC4B'}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-[family-name:var(--font-pixel)] text-3xl md:text-4xl font-bold"
                style={{
                  marginBottom: '0.75rem',
                  background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6 50%, #ec4899)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('welcome.title')}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="font-[family-name:var(--font-ui)] text-lg"
                style={{ marginBottom: '2.5rem', color: '#64748b' }}
              >
                {t('welcome.enterUsername')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStartWelcome()}
                  placeholder="SwiftPanda"
                  className="w-full rounded-2xl font-[family-name:var(--font-ui)] text-lg outline-none transition-all"
                  style={{
                    padding: '1rem 1.5rem',
                    marginBottom: '2rem',
                    background: '#f8fafc',
                    border: '2px solid #e2e8f0',
                    color: '#1e293b',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#0ea5e9'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)'
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  autoFocus
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-4"
              >
                <button
                  onClick={() => {
                    const name = generateRandomUsername()
                    setNameInput(name)
                  }}
                  className="flex-1 text-base font-[family-name:var(--font-ui)] font-semibold rounded-2xl active:scale-[0.97] transition-all cursor-pointer"
                  style={{
                    padding: '1rem 1.25rem',
                    background: 'transparent',
                    border: '2px solid #e2e8f0',
                    color: '#0ea5e9',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#bae6fd'
                    e.currentTarget.style.background = '#f0f9ff'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {'\uD83C\uDFB2'} {t('welcome.randomGenerate')}
                </button>
                <button
                  onClick={handleStartWelcome}
                  className="flex-1 text-base font-[family-name:var(--font-ui)] font-semibold rounded-2xl border-0 active:scale-[0.97] transition-all cursor-pointer"
                  style={{
                    padding: '1rem 1.25rem',
                    background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    color: '#ffffff',
                    boxShadow: '0 4px 20px rgba(14, 165, 233, 0.25)',
                  }}
                >
                  {'\uD83D\uDE80'} {t('welcome.start')}
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
