import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETUP,
  displayNames,
  loadSetup,
  parseSetup,
  saveSetup,
  STORAGE_KEY,
  type GameSetup,
} from './setupStorage'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

const throwing = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
} as unknown as Storage

describe('setupStorage', () => {
  it('round-trips a setup', () => {
    const storage = memoryStorage()
    const setup: GameSetup = {
      names: ['Назар', 'Олена'],
      categoryId: 'digits',
      timePerPlayerMs: 90_000,
      penaltyMs: 5_000,
      firstPlayer: 'random',
    }
    saveSetup(setup, storage)
    expect(loadSetup(storage)).toEqual(setup)
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadSetup(memoryStorage())).toEqual(DEFAULT_SETUP)
  })

  it('falls back to defaults field by field for invalid values', () => {
    expect(
      parseSetup({
        names: ['Назар', 42],
        categoryId: 7,
        timePerPlayerMs: 30_000,
        penaltyMs: '5000',
        firstPlayer: 2,
      }),
    ).toEqual({ ...DEFAULT_SETUP, names: ['Назар', ''] })
    expect(parseSetup('garbage')).toEqual(DEFAULT_SETUP)
  })

  it('ignores malformed JSON', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{nope')
    expect(loadSetup(storage)).toEqual(DEFAULT_SETUP)
  })

  it('truncates names to 20 characters', () => {
    expect(parseSetup({ names: ['x'.repeat(30), ''] }).names[0]).toHaveLength(20)
  })

  it('never throws when storage is blocked', () => {
    expect(loadSetup(throwing)).toEqual(DEFAULT_SETUP)
    expect(() => saveSetup(DEFAULT_SETUP, throwing)).not.toThrow()
  })
})

describe('displayNames', () => {
  it('falls back to "Гравець 1" / "Гравець 2" for empty names', () => {
    expect(displayNames({ ...DEFAULT_SETUP, names: ['Назар', '  '] })).toEqual([
      'Назар',
      'Гравець 2',
    ])
  })
})
