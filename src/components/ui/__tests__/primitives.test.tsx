import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import { Button, IconButton } from '../Button'
import { CardButton } from '../Card'
import { ProgressBar } from '../ProgressBar'
import { ScreenHeader } from '../ScreenHeader'
import { StarRating } from '../StarRating'

beforeAll(() => i18n.changeLanguage('en'))

describe('Button', () => {
  it('is a plain button that does not submit forms', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('does nothing while disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Save</Button>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('names an icon-only button by its label', () => {
    render(<IconButton label="Close">×</IconButton>)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })
})

describe('CardButton', () => {
  it('can be reached and pressed from the keyboard', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<CardButton onClick={onClick}>Chapter 1</CardButton>)
    await user.tab()
    expect(screen.getByRole('button', { name: 'Chapter 1' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('ProgressBar', () => {
  it('reports its value as a percentage', () => {
    render(<ProgressBar value={0.25} label="Chapter progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Chapter progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '25')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('keeps the value between 0 and 100', () => {
    render(<><ProgressBar value={1.4} label="over" /><ProgressBar value={-1} label="under" /></>)
    expect(screen.getByRole('progressbar', { name: 'over' })).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByRole('progressbar', { name: 'under' })).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('StarRating', () => {
  it('says how many of the three stars are earned', () => {
    render(<StarRating stars={{ completed: true, efficient: false, noHints: true }} />)
    expect(screen.getByRole('img', { name: i18n.t('common.starsEarned', { count: 2 }) })).toBeInTheDocument()
  })

  it('shows no stars for a level not played yet', () => {
    render(<StarRating stars={null} />)
    expect(screen.getByRole('img', { name: i18n.t('common.starsEarned', { count: 0 }) })).toBeInTheDocument()
  })
})

describe('ScreenHeader', () => {
  it('has the page title as the top heading and a back button', async () => {
    const onBack = vi.fn()
    render(<ScreenHeader title="Settings" onBack={onBack} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: new RegExp(i18n.t('common.back')) }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('has no back button on a top-level page', () => {
    render(<ScreenHeader title="Home" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
