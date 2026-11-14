import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { getHint } from '@/game/hint-system'
import { renderHintText } from './hint-utils'
import { Walkthrough } from './Walkthrough'
import type { TmuxState } from '@/core/types'
import type { LevelDefinition, ValidationResult } from '@/game/level-types'

interface ObjectivesPanelProps {
  currentLevel: LevelDefinition
  state: TmuxState
  validation: ValidationResult
  commandCount: number
  objectiveFlash: boolean
  efficiency: number
  optimalSteps: number
}

export function ObjectivesPanel({
  currentLevel,
  state,
  validation,
  commandCount,
  objectiveFlash,
  efficiency,
  optimalSteps,
}: ObjectivesPanelProps) {
  const { t } = useTranslation()

  const completedCount = commandCount > 0 ? validation.completedObjectives.length : 0
  const totalObjectives = currentLevel.objectives.length
  const progressRatio = totalObjectives > 0 ? completedCount / totalObjectives : 0
  const allDone = completedCount === totalObjectives && totalObjectives > 0 && commandCount > 0

  return (
    <div
      className="w-[40%] flex flex-col h-full overflow-hidden transition-all duration-500 rounded-2xl"
      style={{
        background: 'linear-gradient(160deg, #f8faff 0%, #f0f4ff 100%)',
        border: objectiveFlash ? '1.5px solid rgba(34,197,94,0.5)' : '1.5px solid #e2e8f0',
        boxShadow: objectiveFlash
          ? '0 4px 24px rgba(34,197,94,0.15), 0 0 0 3px rgba(34,197,94,0.1)'
          : '0 4px 24px rgba(14,165,233,0.06)',
        transition: 'all 0.4s ease',
      }}
    >
      {/* ── Header ── */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          padding: '24px 24px 20px',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
          borderRadius: '14px 14px 0 0',
        }}
      >
        {/* decorative blobs */}
        <div
          className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-4 left-8 w-20 h-20 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center justify-between mb-4">
          <span className="font-[family-name:var(--font-pixel)] text-sm tracking-widest text-white/80 uppercase">
            {t('game.taskObjectives')}
          </span>
          <span
            className="font-[family-name:var(--font-pixel)] text-sm font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            {completedCount}/{totalObjectives}
          </span>
        </div>

        <p className="relative font-[family-name:var(--font-ui)] text-[15px] leading-relaxed text-white/95 mb-4">
          {t(currentLevel.descriptionKey)}
        </p>

        {/* Progress bar */}
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressRatio * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full rounded-full"
            style={{
              background: allDone
                ? 'linear-gradient(90deg, #4ade80, #22d3ee)'
                : 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
            }}
          />
        </div>
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
        {/* ── Objectives ── */}
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-sky-400" />
            <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-slate-400 uppercase">Objectives</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="flex flex-col gap-3">
            {currentLevel.objectives.map((obj, idx) => {
              const completed = commandCount > 0 && validation.completedObjectives.includes(obj.id)
              return (
                <motion.div
                  key={obj.id}
                  className="relative flex items-start gap-3.5 rounded-xl overflow-hidden"
                  style={{
                    padding: '14px 16px',
                    background: completed
                      ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                      : 'rgba(255,255,255,0.85)',
                    border: completed ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                    boxShadow: completed
                      ? '0 2px 12px rgba(34,197,94,0.12)'
                      : '0 1px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s ease',
                  }}
                  animate={completed ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* colored left accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ background: completed ? '#4ade80' : '#cbd5e1' }}
                  />
                  <motion.div
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm mt-0.5"
                    style={{
                      background: completed
                        ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                        : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                      border: completed ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                      boxShadow: completed ? '0 2px 6px rgba(34,197,94,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                    animate={completed ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {completed
                      ? <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 700 }}>✓</span>
                      : <span className="text-slate-400 text-xs font-semibold">{idx + 1}</span>}
                  </motion.div>
                  <span
                    className={`font-[family-name:var(--font-ui)] text-sm leading-relaxed pl-0.5 pt-0.5 ${
                      completed ? 'text-green-700 font-semibold' : 'text-slate-600'
                    }`}
                  >
                    {renderHintText(t(obj.descriptionKey))}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>

        {currentLevel.tutorialSteps && currentLevel.tutorialSteps.length > 0 && (
          <Walkthrough steps={currentLevel.tutorialSteps} state={state} />
        )}

        {/* ── Hint ── */}
        <div className="px-5 pt-5">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #fffbeb, #fef9c3)',
              border: '1.5px solid #fde68a',
              boxShadow: '0 2px 8px rgba(245,158,11,0.08)',
            }}
          >
            {/* top bar */}
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
            <div style={{ padding: '14px 16px' }}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">💡</span>
                <span className="font-[family-name:var(--font-pixel)] text-xs text-amber-700 tracking-widest">HINT</span>
              </div>
              <p className="font-[family-name:var(--font-mono)] text-xs leading-relaxed text-amber-900">
                {renderHintText(t(getHint(currentLevel, 1)))}
              </p>
            </div>
          </div>
        </div>

        {/* ── Next Step / All Done ── */}
        <div className="px-5 pt-5 pb-2">
          {allDone ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-5 text-center"
              style={{
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                border: '1.5px solid #86efac',
                boxShadow: '0 4px 16px rgba(34,197,94,0.2)',
              }}
            >
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-[family-name:var(--font-pixel)] text-sm text-green-700 tracking-widest">ALL DONE!</div>
            </motion.div>
          ) : (
            (() => {
              const nextObj = currentLevel.objectives.find(
                obj => !(commandCount > 0 && validation.completedObjectives.includes(obj.id))
              )
              return nextObj ? (
                <div
                  className="rounded-xl flex items-center gap-3.5"
                  style={{
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.6)',
                    border: '1.5px dashed #cbd5e1',
                  }}
                >
                  <span className="text-xl shrink-0">👉</span>
                  <div>
                    <div className="font-[family-name:var(--font-pixel)] text-[10px] text-slate-400 tracking-widest mb-1">NEXT</div>
                    <div className="font-[family-name:var(--font-ui)] text-xs text-slate-500 leading-relaxed">
                      {renderHintText(t(nextObj.descriptionKey))}
                    </div>
                  </div>
                </div>
              ) : null
            })()
          )}
        </div>
      </div>

      {/* ── Stats (fixed at bottom) ── */}
      <div className="px-5 pb-5 pt-3 flex-shrink-0" style={{ borderTop: '1px solid #e2e8f0' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-indigo-400" />
          <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-slate-400 uppercase">Stats</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>
        <div
          className="grid grid-cols-3 rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.9)',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* CMDS */}
          <div className="flex flex-col items-center justify-center py-3.5 px-2 border-r border-slate-100">
            <span className="text-lg mb-1">⌨️</span>
            <span className="font-[family-name:var(--font-pixel)] text-xl text-sky-500 leading-none">{commandCount}</span>
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1.5 tracking-wide">CMDS</span>
          </div>
          {/* OPTIMAL */}
          <div className="flex flex-col items-center justify-center py-3.5 px-2 border-r border-slate-100">
            <span className="text-lg mb-1">🎯</span>
            <span className="font-[family-name:var(--font-pixel)] text-xl text-slate-700 leading-none">{optimalSteps}</span>
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1.5 tracking-wide">OPTIMAL</span>
          </div>
          {/* EFF */}
          <div className="flex flex-col items-center justify-center py-3.5 px-2">
            <span className="text-lg mb-1">⚡</span>
            <span
              className={`font-[family-name:var(--font-pixel)] text-xl leading-none ${
                commandCount === 0 ? 'text-slate-300' :
                efficiency >= 100 ? 'text-green-500' :
                efficiency >= 67 ? 'text-amber-500' : 'text-red-500'
              }`}
            >
              {commandCount > 0 ? `${efficiency}%` : '--'}
            </span>
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1.5 tracking-wide">EFF.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
