import { describe, it, expect } from 'vitest'
import { chapter1Levels } from '@/game/levels/chapter1'
import { chapter2Levels } from '@/game/levels/chapter2'
import { chapter3Levels } from '@/game/levels/chapter3'
import type { LevelDefinition } from '@/game/level-types'
import en from '../en.json'
import zh from '../zh.json'

type Tree = { readonly [key: string]: string | Tree }

const LANGUAGES: readonly (readonly [string, Tree])[] = [['zh', zh], ['en', en]]
const LEVELS: readonly LevelDefinition[] = [...chapter1Levels, ...chapter2Levels, ...chapter3Levels]

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((all, [key, value]) => (
    typeof value === 'string' ? { ...all, [prefix + key]: value } : { ...all, ...flatten(value, `${prefix}${key}.`) }
  ), {})
}

function levelKeys(level: LevelDefinition): string[] {
  return [
    level.titleKey,
    level.descriptionKey,
    ...level.objectives.map(objective => objective.descriptionKey),
    ...level.hints,
    ...(level.tutorialSteps ?? []).map(step => step.messageKey),
  ]
}

/** Keys that exist for levels only, so each one should belong to a level. `levels.select` and the like are screen text. */
const LEVEL_TEXT = /^(levels\.\d+-\d+\.|game\.(objectives|hints|tutorial)\.)/

describe('translations', () => {
  it('have the same keys in both languages', () => {
    expect(Object.keys(flatten(zh)).sort()).toEqual(Object.keys(flatten(en)).sort())
  })

  it.each(LANGUAGES)('%s has no empty text', (_name, tree) => {
    expect(Object.entries(flatten(tree)).filter(([, text]) => text.trim() === '').map(([key]) => key)).toEqual([])
  })
})

describe.each(LANGUAGES)('level text in %s', (_name, tree) => {
  const texts = flatten(tree)

  it.each(LEVELS.map(level => [level.id, level] as const))('has every key level %s uses', (_id, level) => {
    expect(levelKeys(level).filter(key => !Object.hasOwn(texts, key))).toEqual([])
  })

  it('has no level text that no level uses', () => {
    const used = new Set(LEVELS.flatMap(levelKeys))
    const unused = Object.keys(texts).filter(key => LEVEL_TEXT.test(key) && !used.has(key))
    expect(unused).toEqual([])
  })
})
