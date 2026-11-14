import { describe, expect, it } from 'vitest'
import { pick, pickDistinct, randomInt, seededRandom } from '../random'

const draw = (random: () => number, count: number): number[] => Array.from({ length: count }, () => random())

describe('seededRandom', () => {
  it('gives the same sequence for the same seed', () => {
    expect(draw(seededRandom(42), 20)).toEqual(draw(seededRandom(42), 20))
  })

  it('gives values in [0, 1)', () => {
    const values = draw(seededRandom(7), 1000)
    expect(values.every(value => value >= 0 && value < 1)).toBe(true)
  })

  it('gives different sequences for different seeds', () => {
    expect(draw(seededRandom(1), 5)).not.toEqual(draw(seededRandom(2), 5))
  })

  it('spreads its values over the whole range', () => {
    const values = draw(seededRandom(3), 1000)
    expect(values.some(value => value < 0.1)).toBe(true)
    expect(values.some(value => value > 0.9)).toBe(true)
  })
})

describe('drawing with a random source', () => {
  it('randomInt stays within its bounds and reaches both ends', () => {
    const random = seededRandom(5)
    const values = Array.from({ length: 200 }, () => randomInt(random, 2, 4))
    expect(new Set(values)).toEqual(new Set([2, 3, 4]))
  })

  it('pick returns an item of the list', () => {
    const random = seededRandom(9)
    const items = ['a', 'b', 'c'] as const
    expect(Array.from({ length: 50 }, () => pick(random, items)).every(item => items.includes(item))).toBe(true)
  })

  it('pickDistinct returns the asked number of different items and leaves the list alone', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const chosen = pickDistinct(seededRandom(11), items, 3)
    expect(chosen).toHaveLength(3)
    expect(new Set(chosen).size).toBe(3)
    expect(chosen.every(item => items.includes(item))).toBe(true)
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
