import { describe, expect, it } from 'vitest'
import { defaultState } from '@/core/state'
import type { TmuxState } from '@/core/types'
import type { ChallengeDifficulty, ChallengeGoal } from '@/game/level-types'
import { key, line, prompt } from '@/game/sim/inputs'
import { simulate } from '@/game/sim/simulate'
import type { PlayerInput } from '@/game/sim/simulate'
import en from '@/i18n/en.json'
import zh from '@/i18n/zh.json'
import { challengeComplete, generateChallenge } from '../challenge-generator'
import { CHALLENGE_DIFFICULTIES, CHALLENGE_TIME_LIMITS } from '../difficulty'
import { seededRandom } from '../random'

const SEEDS = Array.from({ length: 100 }, (_, index) => index + 1)
const PAR: Readonly<Record<ChallengeDifficulty, number>> = { beginner: 6, intermediate: 8, advanced: 10 }
const LANGUAGES = [['zh', zh], ['en', en]] as const

const goalFor = (difficulty: ChallengeDifficulty, seed: number): ChallengeGoal =>
  generateChallenge(difficulty, seededRandom(seed))

const goalsOf = (difficulty: ChallengeDifficulty): (readonly [number, ChallengeGoal])[] =>
  SEEDS.map(seed => [seed, goalFor(difficulty, seed)] as const)

/** Everything about a goal but its validators, so two goals can be compared. */
const summary = (goal: ChallengeGoal) => ({
  difficulty: goal.difficulty,
  tasks: goal.tasks.map(({ id, key: textKey, params }) => ({ id, key: textKey, params })),
  solution: goal.solution,
})

const play = (inputs: readonly PlayerInput[]) => simulate(defaultState(), inputs)

function textAt(tree: unknown, dotted: string): string | undefined {
  const found = dotted.split('.').reduce<unknown>(
    (node, part) => (node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    tree,
  )
  return typeof found === 'string' ? found : undefined
}

const placeholders = (text: string): string[] => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(match => match[1])

const FLIPPED: Readonly<Record<string, string>> = {
  '-h': '-v',
  '-v': '-h',
  'even-horizontal': 'even-vertical',
  'even-vertical': 'even-horizontal',
}

const flipWords = (text: string): string => text.split(' ').map(word => FLIPPED[word] ?? word).join(' ')

/** The same input with every split (and even layout) turned the other way. */
function flip(input: PlayerInput): PlayerInput {
  if (input.type === 'line') return line(flipWords(input.text))
  if (input.type === 'prompt') return prompt(flipWords(input.text))
  if (input.type === 'key' && input.key === '%') return key('"')
  if (input.type === 'key' && input.key === '"') return key('%')
  return input
}

/** True when flipping changes the solution, that is, it splits or lays out panes in some direction. */
const splits = (goal: ChallengeGoal): boolean =>
  goal.solution.some(input => JSON.stringify(flip(input)) !== JSON.stringify(input))

/** The finished state with one more pane in the window the player ends in. */
function withExtraPane(state: TmuxState): TmuxState {
  for (const flag of ['-v', '-h']) {
    const run = simulate(state, [line(`tmux split-window ${flag}`)])
    if (run.results[0].errors.length === 0) return run.state
  }
  throw new Error('no room for another pane')
}

describe('challenge difficulties', () => {
  it('lists every difficulty with its time limit', () => {
    expect(CHALLENGE_DIFFICULTIES).toEqual(['beginner', 'intermediate', 'advanced'])
    expect(CHALLENGE_TIME_LIMITS).toEqual({ beginner: 60, intermediate: 90, advanced: 120 })
  })
})

describe.each(CHALLENGE_DIFFICULTIES)('%s challenges', difficulty => {
  const goals = goalsOf(difficulty)

  it('are the same goal for the same seed', () => {
    for (const [seed, goal] of goals) {
      expect(summary(goalFor(difficulty, seed)), `seed ${seed}`).toEqual(summary(goal))
    }
  })

  it('carry their difficulty and at least one task', () => {
    for (const [seed, goal] of goals) {
      expect(goal.difficulty, `seed ${seed}`).toBe(difficulty)
      expect(goal.tasks.length, `seed ${seed}`).toBeGreaterThan(0)
      expect(new Set(goal.tasks.map(task => task.id)).size, `seed ${seed}`).toBe(goal.tasks.length)
    }
  })

  it('are not complete in the default state', () => {
    for (const [seed, goal] of goals) {
      expect(challengeComplete(goal, defaultState()), `seed ${seed}`).toBe(false)
    }
  })

  it('have a solution in which every input works', () => {
    for (const [seed, goal] of goals) {
      const run = play(goal.solution)
      expect(run.results.flatMap(result => result.errors), `seed ${seed}`).toEqual([])
      expect(run.results.every(result => result.handled), `seed ${seed}`).toBe(true)
    }
  })

  it('are completed by their solution, every task validating', () => {
    for (const [seed, goal] of goals) {
      const state = play(goal.solution).state
      expect(goal.tasks.filter(task => !task.validate(state)).map(task => task.id), `seed ${seed}`).toEqual([])
      expect(challengeComplete(goal, state), `seed ${seed}`).toBe(true)
    }
  })

  it('are not complete before the solution ends', () => {
    for (const [seed, goal] of goals) {
      for (let length = 0; length < goal.solution.length; length++) {
        const state = play(goal.solution.slice(0, length)).state
        expect(challengeComplete(goal, state), `seed ${seed} after ${length} inputs`).toBe(false)
      }
    }
  })

  it(`have a solution of 2 to ${PAR[difficulty]} inputs`, () => {
    for (const [seed, goal] of goals) {
      expect(goal.solution.length, `seed ${seed}`).toBeGreaterThanOrEqual(2)
      expect(goal.solution.length, `seed ${seed}`).toBeLessThanOrEqual(PAR[difficulty])
    }
  })

  it.each(LANGUAGES)('have every task text in %s, with every placeholder given', (_lang, tree) => {
    for (const [seed, goal] of goals) {
      for (const task of goal.tasks) {
        expect(task.key, `seed ${seed}`).toMatch(/^challenge\.tasks\./)
        const text = textAt(tree, task.key)
        expect(text, `seed ${seed} ${task.key}`).toBeDefined()
        const missing = placeholders(text ?? '').filter(name => !Object.hasOwn(task.params, name))
        expect(missing, `seed ${seed} ${task.key}`).toEqual([])
      }
    }
  })

  it('vary from seed to seed', () => {
    const distinct = new Set(goals.map(([, goal]) => JSON.stringify(summary(goal))))
    expect(distinct.size).toBeGreaterThan(10)
  })

  it('check the direction of every split', () => {
    const directional = goals.filter(([, goal]) => splits(goal))
    expect(directional.length).toBeGreaterThan(50)
    for (const [seed, goal] of directional) {
      expect(challengeComplete(goal, play(goal.solution.map(flip)).state), `seed ${seed}`).toBe(false)
    }
  })

  it('are not completed with an extra pane', () => {
    for (const [seed, goal] of goals) {
      expect(challengeComplete(goal, withExtraPane(play(goal.solution).state)), `seed ${seed}`).toBe(false)
    }
  })
})

describe('beginner challenges', () => {
  const goals = goalsOf('beginner').map(([, goal]) => goal)

  it('ask for two or three windows, each with a shape', () => {
    const counts = new Set(goals.map(goal => goal.tasks.length))
    expect(counts).toEqual(new Set([2, 3]))
    const keys = new Set(goals.flatMap(goal => goal.tasks.map(task => task.key)))
    expect(keys).toEqual(new Set(['challenge.tasks.windowSingle', 'challenge.tasks.windowRow', 'challenge.tasks.windowColumn']))
  })

  it('do not pass a two-pane window split the other way', () => {
    const goal = goals.find(candidate => candidate.tasks.some(task => task.key === 'challenge.tasks.windowRow'))
    if (!goal) throw new Error('no side-by-side goal in the seeds')
    const task = goal.tasks.find(candidate => candidate.key === 'challenge.tasks.windowRow')
    const name = String(task?.params.window)
    const stacked = play([line(`tmux rename-window ${name}`), line('tmux split-window -v')]).state
    const sideBySide = play([line(`tmux rename-window ${name}`), line('tmux split-window -h')]).state
    expect(task?.validate(stacked)).toBe(false)
    expect(task?.validate(sideBySide)).toBe(true)
  })
})

describe('intermediate challenges', () => {
  const goals = goalsOf('intermediate').map(([, goal]) => goal)
  const keys = new Set(goals.flatMap(goal => goal.tasks.map(task => task.key)))

  it.each([
    'challenge.tasks.windowEvenRow',
    'challenge.tasks.windowEvenColumn',
    'challenge.tasks.windowGrid',
    'challenge.tasks.windowSynced',
    'challenge.tasks.windowZoomed',
  ])('include the kind with %s', textKey => {
    expect(keys.has(textKey)).toBe(true)
  })

  it('do not pass an uneven row', () => {
    const goal = goals.find(candidate => candidate.tasks.some(task => task.key === 'challenge.tasks.windowEvenRow'))
    if (!goal) throw new Error('no even-row goal in the seeds')
    const uneven = goal.solution.filter(input => !(input.type === 'line' && input.text.includes('select-layout')))
    expect(challengeComplete(goal, play(uneven).state)).toBe(false)
  })
})

describe('advanced challenges', () => {
  const goals = goalsOf('advanced').map(([, goal]) => goal)

  it('ask for two sessions and one option', () => {
    for (const goal of goals) {
      const sessions = goal.tasks.filter(task => task.key === 'challenge.tasks.sessionWindowCount')
      expect(sessions).toHaveLength(2)
      const options = goal.tasks.filter(task => ['challenge.tasks.option', 'challenge.tasks.statusBg'].includes(task.key))
      expect(options).toHaveLength(1)
    }
  })

  it('do not pass when the last option is left out', () => {
    for (const goal of goals) {
      expect(challengeComplete(goal, play(goal.solution.slice(0, -1)).state)).toBe(false)
    }
  })
})
