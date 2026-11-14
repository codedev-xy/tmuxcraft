import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { useGameStore } from '@/store/game-store'
import { LevelSelect } from '../LevelSelect'
import { done, resetStores, setProgress } from './fixtures'

beforeAll(() => i18n.changeLanguage('en'))
beforeEach(resetStores)

const levelButtons = () => screen.getAllByRole('button', { name: /^\d-\d+ / })
const levelButton = (id: string) => screen.getByRole('button', { name: new RegExp(`^${id} `) })

describe('LevelSelect', () => {
  it.each([[1, 11], [2, 8], [3, 7]])('chapter %i lists its %i levels', (chapter, count) => {
    useGameStore.setState({ currentChapter: chapter })
    render(<LevelSelect />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(levelButtons()).toHaveLength(count)
    expect(levelButtons()[0]).toHaveAccessibleName(new RegExp(`^${chapter}-1 `))
  })

  it('falls back to chapter 1 for an unknown chapter', () => {
    useGameStore.setState({ currentChapter: 9 })
    render(<LevelSelect />)
    expect(levelButtons()).toHaveLength(11)
  })

  it('marks only the next unfinished level', () => {
    setProgress(done('1-1'), done('1-2'), done('1-4'))
    render(<LevelSelect />)
    expect(screen.getAllByText('Next')).toHaveLength(1)
    expect(within(levelButton('1-3')).getByText('Next')).toBeInTheDocument()
  })

  it('marks nothing once the chapter is finished', () => {
    useGameStore.setState({ currentChapter: 3 })
    setProgress(...['3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-7'].map(id => done(id)))
    render(<LevelSelect />)
    expect(screen.queryByText('Next')).toBeNull()
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
  })

  it('starts a level when it is pressed, finished or not', async () => {
    setProgress(done('1-1'))
    render(<LevelSelect />)
    const user = userEvent.setup()
    await user.click(levelButton('1-5'))
    expect(useGameStore.getState().currentLevel?.id).toBe('1-5')
    expect(useGameStore.getState().currentScreen).toBe('game')
  })

  it('shows the stars and the best count of a completed level', () => {
    setProgress(done('1-1', 2, 7))
    render(<LevelSelect />)
    const card = levelButton('1-1')
    expect(within(card).getByRole('img', { name: '2 of 3 stars' })).toBeInTheDocument()
    expect(within(card).getByText('Fewest steps: 7')).toBeInTheDocument()
    expect(within(levelButton('1-2')).queryByRole('img')).toBeNull()
  })

  it('names each level by its id and title, and every button by what it does', () => {
    render(<LevelSelect />)
    expect(levelButton('1-3')).toHaveAccessibleName('1-3 Pane Navigation')
    screen.getAllByRole('button').forEach(button => expect(button).toHaveAccessibleName())
  })

  it('shows the chapter progress', () => {
    setProgress(done('1-1', 3), done('1-2', 2))
    render(<LevelSelect />)
    expect(screen.getByText('2/11 levels completed')).toBeInTheDocument()
    expect(screen.getByText('5 / 33 stars')).toBeInTheDocument()
  })

  it('goes back to the chapter list', async () => {
    render(<LevelSelect />)
    await userEvent.setup().click(screen.getByRole('button', { name: /back/i }))
    expect(useGameStore.getState().currentScreen).toBe('chapter-select')
  })
})
