import { describe, expect, it } from 'vitest'
import { pluralUk } from './pluralUk'

const forms = ['помилка', 'помилки', 'помилок'] as const

describe('pluralUk', () => {
  it.each([
    [0, 'помилок'],
    [1, 'помилка'],
    [2, 'помилки'],
    [4, 'помилки'],
    [5, 'помилок'],
    [11, 'помилок'],
    [12, 'помилок'],
    [14, 'помилок'],
    [21, 'помилка'],
    [22, 'помилки'],
    [25, 'помилок'],
    [111, 'помилок'],
  ])('%i → %s', (n, expected) => {
    expect(pluralUk(n, forms)).toBe(expected)
  })
})
