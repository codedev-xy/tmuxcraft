import { afterAll, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import i18n from '@/i18n'
import { useLanguage } from '../language'

afterAll(() => i18n.changeLanguage('en'))

describe('useLanguage', () => {
  it('reads the language i18n is showing', async () => {
    await i18n.changeLanguage('en')
    expect(renderHook(() => useLanguage()).result.current[0]).toBe('en')
  })

  it('follows a change made anywhere else', async () => {
    await i18n.changeLanguage('en')
    const { result } = renderHook(() => useLanguage())
    await act(() => i18n.changeLanguage('zh'))
    expect(result.current[0]).toBe('zh')
  })

  it('changes the language for the whole app and remembers it', async () => {
    await i18n.changeLanguage('en')
    const { result } = renderHook(() => useLanguage())
    await act(async () => result.current[1]('zh'))
    expect(result.current[0]).toBe('zh')
    expect(i18n.t('settings.title')).toBe('设置')
    expect(localStorage.getItem('i18nextLng')).toBe('zh')
  })

  it.each([['en-US', 'en'], ['zh-CN', 'zh'], ['fr', 'zh']])('reads %s as %s', async (detected, shown) => {
    await i18n.changeLanguage(detected)
    expect(renderHook(() => useLanguage()).result.current[0]).toBe(shown)
  })

  it('keeps the lang attribute of the page in step', async () => {
    await i18n.changeLanguage('en')
    expect(document.documentElement.lang).toBe('en')
    await i18n.changeLanguage('zh-CN')
    expect(document.documentElement.lang).toBe('zh')
  })
})
