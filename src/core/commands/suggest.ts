function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    }
    row = next
  }
  return row[b.length]
}

/** Short words get less slack, so that two unrelated letters never "resemble" `ls`. */
function allowedDistance(word: string): number {
  if (word.length <= 2) return 1
  return word.length <= 5 ? 2 : 3
}

/** The word closest to a mistyped `input`, for "did you mean"; the earliest of `words` wins a tie. */
export function closestWord(input: string, words: readonly string[]): string | undefined {
  const typed = input.toLowerCase()
  let best: string | undefined
  let bestDistance = allowedDistance(typed) + 1
  for (const word of words) {
    const distance = editDistance(typed, word.toLowerCase())
    if (distance < bestDistance) {
      best = word
      bestDistance = distance
    }
  }
  return best
}
