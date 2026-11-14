import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getActiveSession } from '@/core/selectors'
import { levelAfter } from '@/game/chapters'
import type { LevelDefinition } from '@/game/level-types'
import { useGameStore } from '@/store/game-store'
import { GameFooter } from './GameFooter'
import { GameHeader } from './GameHeader'
import { LevelCompleteDialog } from './LevelCompleteDialog'
import { ObjectivesPanel } from './ObjectivesPanel'
import { PlayLayout, TerminalFrame } from './PlayLayout'
import { QuickReferenceDialog } from './QuickReferenceDialog'
import { TerminalView } from './TerminalView'
import { shownObjectives } from './play-utils'
import { useLevelPlay } from './useLevelPlay'

interface LevelPlayProps {
  level: LevelDefinition
  onRetry: () => void
}

/** One attempt at a level: header, terminal, objectives, footer, and the dialogs over them. */
export function LevelPlay({ level, onRetry }: LevelPlayProps) {
  const { t } = useTranslation()
  const play = useLevelPlay(level)
  const setScreen = useGameStore(s => s.setScreen)
  const startLevel = useGameStore(s => s.startLevel)
  const [referenceOpen, setReferenceOpen] = useState(false)

  const next = levelAfter(level.id)
  const backToLevels = () => setScreen('level-select')
  const { state } = play.session
  const activeSession = state.isDetached ? null : getActiveSession(state)

  return (
    <>
      <PlayLayout
        header={
          <GameHeader
            level={level}
            objectivesDone={shownObjectives(play.validation, play.commandCount).length}
            commandCount={play.commandCount}
            onBack={backToLevels}
          />
        }
        terminal={
          <TerminalFrame title={`tmux — ${activeSession ? activeSession.name : 'bash'}`} controls={play.shake}>
            <TerminalView session={play.session} onResult={play.handleResult} disabled={play.isComplete || referenceOpen} />
          </TerminalFrame>
        }
        asideLabel={t('game.taskObjectives')}
        aside={
          <ObjectivesPanel
            currentLevel={level}
            state={state}
            validation={play.validation}
            commandCount={play.commandCount}
            hintsUsed={play.hintsUsed}
            onRevealHint={play.revealHint}
            isComplete={play.isComplete}
          />
        }
        footer={
          <GameFooter
            comboCount={play.comboCount}
            error={play.error}
            onRetry={onRetry}
            onOpenReference={() => setReferenceOpen(true)}
          />
        }
      />
      <QuickReferenceDialog open={referenceOpen} onClose={() => setReferenceOpen(false)} />
      <LevelCompleteDialog
        open={play.isComplete}
        level={level}
        stars={play.stars}
        commandCount={play.commandCount}
        hasNext={next !== null}
        onNext={() => next && startLevel(next)}
        onRetry={onRetry}
        onBack={backToLevels}
      />
    </>
  )
}
