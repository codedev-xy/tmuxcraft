import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { renderHintText } from '@/components/game/hint-utils'
import { cx } from '@/components/ui/cx'
import { Kbd } from '@/components/ui/Kbd'
import { Pill } from '@/components/ui/Pill'
import { displayKey } from '@/core/keymap'
import type { KeyStep, KeysEntry, ReferenceEntry } from '@/game/reference'
import { CopyButton } from './CopyButton'

function KeyChoice({ step }: { step: KeyStep }) {
  const choices = typeof step === 'string' ? [step] : step
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {choices.map((choice, index) => (
        <Fragment key={choice}>
          {index > 0 && <span className="text-xs text-ink-muted">/</span>}
          <Kbd>{displayKey(choice)}</Kbd>
        </Fragment>
      ))}
    </span>
  )
}

function KeySequence({ entry }: { entry: KeysEntry }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {entry.keys.map((step, index) => <KeyChoice key={index} step={step} />)}
    </span>
  )
}

interface ReferenceEntryRowProps {
  entry: ReferenceEntry
  compact: boolean
}

/** One entry: what to press or type, then what it does. */
export function ReferenceEntryRow({ entry, compact }: ReferenceEntryRowProps) {
  const { t } = useTranslation()
  return (
    <li className={cx('flex flex-col', compact ? 'gap-0.5 py-1.5' : 'gap-1.5 rounded-control border border-line bg-surface px-3 py-2.5')}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {entry.kind === 'keys' ? (
          <KeySequence entry={entry} />
        ) : (
          <>
            <code className="font-mono text-sm font-semibold break-all text-accent-deep">{entry.text}</code>
            <CopyButton text={entry.text} />
          </>
        )}
        {entry.popular && !compact && <Pill tone="warning" className="ml-auto">{t('reference.popular')}</Pill>}
      </div>
      <p className={cx('leading-snug text-ink-soft', compact ? 'text-xs' : 'text-sm')}>
        {renderHintText(t(`reference.entries.${entry.id}`))}
      </p>
    </li>
  )
}
