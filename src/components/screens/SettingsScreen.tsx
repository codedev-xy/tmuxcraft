import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { version } from '../../../package.json'
import { Button } from '@/components/ui/Button'
import { Card, CardButton } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageBackground } from '@/components/ui/PageBackground'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ALL_LEVELS } from '@/game/chapters'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'

const LANGUAGES = ['zh', 'en'] as const

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <h2 className="font-display text-lg font-bold text-ink">
      <span aria-hidden="true" className="mr-2">{icon}</span>
      {children}
    </h2>
  )
}

function LanguageCard() {
  const { t, i18n } = useTranslation()
  const language = useUserStore(s => s.language)
  const setLanguage = useUserStore(s => s.setLanguage)
  const choose = (lang: typeof LANGUAGES[number]) => {
    setLanguage(lang)
    void i18n.changeLanguage(lang)
  }
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon="🌐">{t('settings.language')}</SectionTitle>
      <div role="group" aria-label={t('settings.language')} className="mt-4 grid grid-cols-2 gap-3">
        {LANGUAGES.map(lang => (
          <Button
            key={lang}
            size="lg"
            variant={language === lang ? 'primary' : 'secondary'}
            aria-pressed={language === lang}
            onClick={() => choose(lang)}
          >
            {t(`settings.languageNames.${lang}`)}
          </Button>
        ))}
      </div>
    </Card>
  )
}

function ReferenceCard({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation()
  return (
    <CardButton onClick={onOpen} className="flex items-center gap-4 p-5 sm:p-6">
      <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-control bg-accent-faint text-2xl">📖</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-bold text-accent-deep">{t('reference.title')}</span>
        <span className="block text-sm text-ink-muted">{t('settings.referenceHint')}</span>
      </span>
      <span aria-hidden="true" className="text-xl text-accent-deep">→</span>
    </CardButton>
  )
}

function AboutRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  )
}

function AboutCard() {
  const { t } = useTranslation()
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle icon="📦">{t('settings.about')}</SectionTitle>
      <dl className="mt-2 divide-y divide-line">
        <AboutRow label={t('settings.version')} value={version} />
        <AboutRow label={t('settings.levels')} value={ALL_LEVELS.length} />
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">{t('settings.aboutText')}</p>
    </Card>
  )
}

function ResetDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation()
  return (
    <Dialog
      open={open}
      title={t('settings.resetTitle')}
      onClose={onCancel}
      icon={<div aria-hidden="true" className="mb-3 text-5xl">⚠️</div>}
      centered
      width="sm"
    >
      <p className="mt-3 leading-relaxed text-ink-soft">{t('settings.resetConfirm')}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button data-autofocus onClick={onCancel}>{t('settings.cancel')}</Button>
        <Button variant="danger" onClick={onConfirm}>{t('settings.confirm')}</Button>
      </div>
    </Dialog>
  )
}

function ResetCard() {
  const { t } = useTranslation()
  const resetProgress = useProgressStore(s => s.resetProgress)
  const [asking, setAsking] = useState(false)
  const [done, setDone] = useState(false)
  const ask = () => {
    setDone(false)
    setAsking(true)
  }
  const confirm = () => {
    resetProgress()
    setAsking(false)
    setDone(true)
  }
  return (
    <Card data-tone="danger" className="border-tone-line p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="font-display text-lg font-bold text-tone-strong">
            <span aria-hidden="true" className="mr-2">⚠️</span>
            {t('settings.dangerZone')}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t('settings.resetHint')}</p>
        </div>
        <Button variant="danger" onClick={ask}>{t('settings.resetProgress')}</Button>
      </div>
      <p role="status" className="mt-3 text-sm font-semibold text-success-strong empty:hidden">{done && t('settings.resetDone')}</p>
      <ResetDialog open={asking} onCancel={() => setAsking(false)} onConfirm={confirm} />
    </Card>
  )
}

export function SettingsScreen() {
  const { t } = useTranslation()
  const setScreen = useGameStore(s => s.setScreen)
  return (
    <PageBackground>
      <ScreenHeader title={t('settings.title')} icon="⚙️" onBack={() => setScreen('home')} />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <LanguageCard />
          <ReferenceCard onOpen={() => setScreen('reference')} />
          <AboutCard />
          <ResetCard />
        </div>
      </main>
    </PageBackground>
  )
}
