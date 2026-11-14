import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PageBackground } from '@/components/ui/PageBackground'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { CHAPTERS } from '@/game/chapters'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { ChapterCard } from './ChapterCard'

export function ChapterSelect() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const setChapter = useGameStore(s => s.setChapter)
  const levelProgress = useProgressStore(s => s.levelProgress)

  const open = (chapter: number) => {
    setChapter(chapter)
    setScreen('level-select')
  }

  return (
    <PageBackground>
      <ScreenHeader title={t('chapters.select')} subtitle={t('chapters.subtitle')} icon="📖" onBack={() => setScreen('home')} />
      <main className="flex-1 overflow-y-auto">
        <ul className="mx-auto grid min-h-full w-full max-w-6xl grid-cols-1 content-center gap-5 p-4 sm:p-6 lg:grid-cols-3">
          {CHAPTERS.map((chapter, index) => (
            <motion.li
              key={chapter.id}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12, type: 'spring', stiffness: 120, damping: 16 }}
            >
              <ChapterCard chapter={chapter} progress={levelProgress} onOpen={() => open(chapter.id)} />
            </motion.li>
          ))}
        </ul>
      </main>
    </PageBackground>
  )
}
