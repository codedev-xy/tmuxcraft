import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReferenceList } from '@/components/reference/ReferenceList'
import { PageBackground } from '@/components/ui/PageBackground'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { filterReference } from '@/game/reference'
import { useGameStore } from '@/store/game-store'

export function ReferenceScreen() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  const [query, setQuery] = useState('')
  const searchId = useId()
  const shown = filterReference(query, entry => t(`reference.entries.${entry.id}`))
    .reduce((count, category) => count + category.entries.length, 0)

  return (
    <PageBackground>
      <ScreenHeader title={t('reference.title')} subtitle={t('reference.subtitle')} icon="📖" onBack={() => setScreen('home')} />
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2">
            <label htmlFor={searchId} className="sr-only">{t('reference.searchLabel')}</label>
            <div className="flex min-w-0 flex-1 basis-64 items-center gap-2 rounded-control border border-line bg-surface px-3 shadow-card focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
              <span aria-hidden="true">🔍</span>
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('reference.search')}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            <p aria-live="polite" className="text-sm font-semibold text-ink-muted">{t('reference.total', { count: shown })}</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-8 sm:px-6">
          <div className="mx-auto w-full max-w-4xl">
            <ReferenceList query={query} />
          </div>
        </div>
      </main>
    </PageBackground>
  )
}
