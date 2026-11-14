/** A deterministic source of numbers in [0, 1) (mulberry32): the same seed always gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let current = seed >>> 0
  return () => {
    current = (current + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(current ^ (current >>> 15), current | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

/** A whole number from `min` to `max`, both included. */
export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1))
}

export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[randomInt(random, 0, items.length - 1)]
}

/** `count` different items of the list, in random order; the list itself is left as it is. */
export function pickDistinct<T>(random: () => number, items: readonly T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return []
  const index = randomInt(random, 0, items.length - 1)
  const rest = [...items.slice(0, index), ...items.slice(index + 1)]
  return [items[index], ...pickDistinct(random, rest, count - 1)]
}
