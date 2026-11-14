import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { CHAPTERS } from '@/game/chapters'
import { useGameStore } from '@/store/game-store'
import { ChapterSelect } from '../ChapterSelect'
import { done, resetStores, setProgress } from './fixtures'

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(resetStores)

const chapterButton = (name: RegExp) => screen.getByRole('button', { name })

describe('ChapterSelect', () => {
  it('has one button per chapter, with its progress', () => {
    setProgress(done('1-1', 3), done('1-2', 1), done('2-1', 2))
    render(<ChapterSelect />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const first = chapterButton(/^Chapter 1/)
    expect(within(first).getByText('2/11 levels completed')).toBeInTheDocument()
    expect(within(first).getByText('4 / 33 stars')).toBeInTheDocument()
    expect(within(chapterButton(/^Chapter 2/)).getByText('1/8 levels completed')).toBeInTheDocument()
    expect(within(chapterButton(/^Chapter 3/)).getByText('0/7 levels completed')).toBeInTheDocument()
    screen.getAllByRole('button').forEach(button => expect(button).toHaveAccessibleName())
  })

  it('opens the levels of the chosen chapter', async () => {
    render(<ChapterSelect />)
    await userEvent.setup().click(chapterButton(/^Chapter 2/))
    expect(useGameStore.getState().currentChapter).toBe(2)
    expect(useGameStore.getState().currentScreen).toBe('level-select')
  })

  it('marks a finished chapter as completed', () => {
    setProgress(...CHAPTERS[0].levels.map(level => done(level.id)))
    render(<ChapterSelect />)
    expect(within(chapterButton(/^Chapter 1/)).getByText('Completed')).toBeInTheDocument()
    expect(within(chapterButton(/^Chapter 2/)).queryByText('Completed')).toBeNull()
  })

  it('goes back home', async () => {
    useGameStore.setState({ currentScreen: 'chapter-select' })
    render(<ChapterSelect />)
    await userEvent.setup().click(screen.getByRole('button', { name: /back/i }))
    expect(useGameStore.getState().currentScreen).toBe('home')
  })
})
