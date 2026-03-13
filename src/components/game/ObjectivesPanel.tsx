import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { getHint } from '@/game/hint-system'
import { renderHintText } from './hint-utils'
import type { LevelDefinition, ValidationResult } from '@/game/level-types'

interface ObjectivesPanelProps {
  currentLevel: LevelDefinition
  validation: ValidationResult
  commandCount: number
  objectiveFlash: boolean
  efficiency: number
  optimalSteps: number
}

export function ObjectivesPanel({
  currentLevel,
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
      className={`w-[40%] flex flex-col h-full overflow-hidden transition-all duration-500 rounded-2xl`}
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
          padding: '20px 20px 16px',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
          borderRadius: '14px 14px 0 0',
        }}
      >
        {/* decorative blobs */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-10 w-16 h-16 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center justify-between mb-3">
          <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-white/70 uppercase">
            {t('game.taskObjectives')}
          </span>
          <span
            className="font-[family-name:var(--font-ui)] text-xs font-bold px-2.5 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
          >
            {completedCount}/{totalObjectives}
          </span>
        </div>

        <p className="relative font-[family-name:var(--font-ui)] text-sm leading-snug text-white/90 mb-3">
          {t(currentLevel.descriptionKey)}
        </p>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
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

      {/* ── Objectives ── */}
      <div className="px-4 pt-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-sky-400" />
          <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-slate-400">OBJECTIVES</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {currentLevel.objectives.map((obj, idx) => {
            const completed = commandCount > 0 && validation.completedObjectives.includes(obj.id)
            return (
              <motion.div
                key={obj.id}
                className="relative flex items-start gap-3 rounded-xl overflow-hidden"
                style={{
                  padding: '10px 12px',
                  background: completed
                    ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                    : 'rgba(255,255,255,0.8)',
                  border: completed ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                  boxShadow: completed
                    ? '0 2px 8px rgba(34,197,94,0.12)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
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
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm mt-0.5"
                  style={{
                    background: completed ? '#dcfce7' : '#f1f5f9',
                    border: completed ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                  }}
                  animate={completed ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {completed ? '✓' : <span className="text-slate-300 text-xs">{idx + 1}</span>}
                </motion.div>
                <span
                  className={`font-[family-name:var(--font-ui)] text-sm leading-snug pl-1 ${
                    completed ? 'text-green-700 font-semibold' : 'text-slate-600'
                  }`}
                >
                  {t(obj.descriptionKey)}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Hint ── */}
      <div className="px-4 pt-4 flex-shrink-0">
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
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-2">
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
      <div className="px-4 pt-4 flex-1 flex flex-col justify-end pb-1">
        {allDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-4 text-center"
            style={{
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              border: '1.5px solid #86efac',
              boxShadow: '0 4px 16px rgba(34,197,94,0.2)',
            }}
          >
            <div className="text-2xl mb-1">🎉</div>
            <div className="font-[family-name:var(--font-pixel)] text-xs text-green-700 tracking-widest">ALL DONE!</div>
          </motion.div>
        ) : (
          (() => {
            const nextObj = currentLevel.objectives.find(
              obj => !(commandCount > 0 && validation.completedObjectives.includes(obj.id))
            )
            return nextObj ? (
              <div
                className="rounded-xl p-3 flex items-center gap-3"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1.5px dashed #cbd5e1',
                }}
              >
                <span className="text-xl shrink-0">👉</span>
                <div>
                  <div className="font-[family-name:var(--font-pixel)] text-[10px] text-slate-400 tracking-widest mb-0.5">NEXT</div>
                  <div className="font-[family-name:var(--font-ui)] text-xs text-slate-500 leading-snug">
                    {t(nextObj.descriptionKey)}
                  </div>
                </div>
              </div>
            ) : null
          })()
        )}
      </div>

      {/* ── Stats ── */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-1 h-4 rounded-full bg-indigo-400" />
          <span className="font-[family-name:var(--font-pixel)] text-xs tracking-widest text-slate-400">STATS</span>
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
          <div className="flex flex-col items-center justify-center py-3 px-2 border-r border-slate-100">
            <span className="text-lg mb-1">⌨️</span>
            <span className="font-[family-name:var(--font-pixel)] text-xl text-sky-500 leading-none">{commandCount}</span>
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1 tracking-wide">CMDS</span>
          </div>
          {/* OPTIMAL */}
          <div className="flex flex-col items-center justify-center py-3 px-2 border-r border-slate-100">
            <span className="text-lg mb-1">🎯</span>
            <span className="font-[family-name:var(--font-pixel)] text-xl text-slate-700 leading-none">{optimalSteps}</span>
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1 tracking-wide">OPTIMAL</span>
          </div>
          {/* EFF */}
          <div className="flex flex-col items-center justify-center py-3 px-2">
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
            <span className="font-[family-name:var(--font-ui)] text-[10px] text-slate-400 mt-1 tracking-wide">EFF.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
