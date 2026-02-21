import { lazy, Suspense } from 'react'
import { useGameStore } from '@/store/game-store'
import { HomeScreen } from '@/components/screens/HomeScreen'

const ChapterSelect = lazy(() => import('@/components/screens/ChapterSelect').then(m => ({ default: m.ChapterSelect })))
const LevelSelect = lazy(() => import('@/components/screens/LevelSelect').then(m => ({ default: m.LevelSelect })))
const GameScreen = lazy(() => import('@/components/game/GameScreen').then(m => ({ default: m.GameScreen })))
const ChallengeSelect = lazy(() => import('@/components/challenge/ChallengeSelect').then(m => ({ default: m.ChallengeSelect })))
const ChallengeScreen = lazy(() => import('@/components/challenge/ChallengeScreen').then(m => ({ default: m.ChallengeScreen })))
const ReferenceScreen = lazy(() => import('@/components/screens/ReferenceScreen').then(m => ({ default: m.ReferenceScreen })))
const SettingsScreen = lazy(() => import('@/components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })))

function App() {
  const currentScreen = useGameStore(s => s.currentScreen)

  const screen = (() => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />
      case 'chapter-select':
        return <ChapterSelect />
      case 'level-select':
        return <LevelSelect />
      case 'game':
        return <GameScreen />
      case 'challenge-select':
        return <ChallengeSelect />
      case 'challenge':
        return <ChallengeScreen />
      case 'reference':
        return <ReferenceScreen />
      case 'settings':
        return <SettingsScreen />
      default:
        return <HomeScreen />
    }
  })()

  return <Suspense fallback={null}>{screen}</Suspense>
}

export default App
