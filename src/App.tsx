import { useGameStore } from '@/store/game-store'
import { HomeScreen } from '@/components/screens/HomeScreen'
import { ChapterSelect } from '@/components/screens/ChapterSelect'
import { LevelSelect } from '@/components/screens/LevelSelect'
import { GameScreen } from '@/components/game/GameScreen'
import { ChallengeSelect } from '@/components/challenge/ChallengeSelect'
import { ChallengeScreen } from '@/components/challenge/ChallengeScreen'
import { AchievementScreen } from '@/components/screens/AchievementScreen'
import { ReferenceScreen } from '@/components/screens/ReferenceScreen'
import { SettingsScreen } from '@/components/screens/SettingsScreen'

function App() {
  const currentScreen = useGameStore(s => s.currentScreen)

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
    case 'achievements':
      return <AchievementScreen />
    case 'reference':
      return <ReferenceScreen />
    case 'settings':
      return <SettingsScreen />
    default:
      return <HomeScreen />
  }
}

export default App
