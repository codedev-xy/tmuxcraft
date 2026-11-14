import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { version } from '../../../../package.json'
import { useGameStore } from '@/store/game-store'
import { useProgressStore } from '@/store/progress-store'
import { useUserStore } from '@/store/user-store'
import { SettingsScreen } from '../SettingsScreen'

const STARS = { completed: true, efficient: false, noHints: false }

beforeEach(async () => {
  await i18n.changeLanguage('en')
  useUserStore.getState().setLanguage('en')
  useGameStore.getState().setScreen('settings')
  useProgressStore.getState().resetProgress()
  useProgressStore.getState().completeLevel('1-1', STARS, 1)
})
afterAll(() => i18n.changeLanguage('en'))

function open() {
  const user = userEvent.setup()
  render(<SettingsScreen />)
  return user
}

describe('SettingsScreen', () => {
  it('marks the current language as pressed', () => {
    open()
    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the language in i18n and in the store', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: '中文' }))
    expect(i18n.language).toBe('zh')
    expect(useUserStore.getState().language).toBe('zh')
    expect(screen.getByRole('button', { name: '中文' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('设置')
  })

  it('asks before resetting, with cancel focused first', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    expect(screen.getByRole('dialog', { name: 'Reset all progress?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('keeps the progress when Escape closes the question', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useProgressStore.getState().levelProgress['1-1']).toBeDefined()
  })

  it('keeps the progress when cancelled', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useProgressStore.getState().levelProgress['1-1']).toBeDefined()
  })

  it('clears the progress when confirmed', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'Reset Progress' }))
    await user.click(screen.getByRole('button', { name: 'Reset everything' }))
    expect(useProgressStore.getState().levelProgress).toEqual({})
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Progress cleared')
  })

  it('shows the version from package.json', () => {
    open()
    expect(screen.getByText(version)).toBeInTheDocument()
  })

  it('opens the reference', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: /Command Reference/ }))
    expect(useGameStore.getState().currentScreen).toBe('reference')
  })

  it('goes back home', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(useGameStore.getState().currentScreen).toBe('home')
  })

  it('has no settings for sound or a user name', () => {
    open()
    expect(screen.queryByText(/sound/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/user ?name/i)).not.toBeInTheDocument()
  })
})
