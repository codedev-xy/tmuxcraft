import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReferenceList } from '@/components/reference/ReferenceList'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'

interface QuickReferenceDialogProps {
  open: boolean
  onClose: () => void
}

function QuickReferenceBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const searchId = useId()
  const [query, setQuery] = useState('')
  return (
    <>
      <label htmlFor={searchId} className="mt-4 block text-sm font-semibold text-ink-soft">{t('game.searchCommands')}</label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder={t('game.searchPlaceholder')}
        autoComplete="off"
        spellCheck={false}
        className="mt-1 w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
      />
      <div className="mt-4 max-h-[55dvh] overflow-y-auto">
        <ReferenceList query={query} compact />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>{t('common.close')}</Button>
      </div>
    </>
  )
}

/** The command reference, searchable, over the level. The terminal takes no keys while it is open. */
export function QuickReferenceDialog({ open, onClose }: QuickReferenceDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} title={t('game.quickReference')} onClose={onClose} width="lg">
      <QuickReferenceBody onClose={onClose} />
    </Dialog>
  )
}
