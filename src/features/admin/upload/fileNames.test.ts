import { describe, expect, it } from 'vitest'
import { answerFromName, parseFileName, planUpload } from './fileNames'

const f = (name: string) => ({ name })

describe('parseFileName', () => {
  it('splits base, answer suffix and extension', () => {
    expect(parseFileName('fiat-500.jpg')).toEqual({ base: 'fiat-500', isAnswer: false, ext: 'jpg' })
    expect(parseFileName('fiat-500.Answer.JPG')).toEqual({
      base: 'fiat-500',
      isAnswer: true,
      ext: 'jpg',
    })
    expect(parseFileName('noext')).toEqual({ base: 'noext', isAnswer: false, ext: '' })
  })
})

describe('answerFromName', () => {
  it('turns separators into spaces and capitalises lower-case words', () => {
    expect(answerFromName('fiat-500')).toBe('Fiat 500')
    expect(answerFromName('eiffel_tower')).toBe('Eiffel Tower')
    expect(answerFromName('iPhone-15')).toBe('iPhone 15')
    expect(answerFromName('  собор--святої_софії ')).toBe('Собор Святої Софії')
    expect(answerFromName('Mr.Bean')).toBe('Mr Bean')
  })
})

describe('planUpload', () => {
  it('pairs an answer photo from the same batch, case-insensitively', () => {
    const plan = planUpload([f('Fiat-500.jpg'), f('fiat-500.answer.png'), f('bmw.webp')], [])
    expect(plan.errors).toEqual([])
    expect(plan.items).toEqual([
      {
        kind: 'new',
        file: f('Fiat-500.jpg'),
        answerFile: f('fiat-500.answer.png'),
        answer: 'Fiat 500',
      },
      { kind: 'new', file: f('bmw.webp'), answerFile: null, answer: 'Bmw' },
    ])
  })

  it('attaches a lone answer file to an existing photo with the same answer', () => {
    const plan = planUpload([f('fiat-500.answer.jpg')], [{ id: 'p1', answer: ' fiat 500 ' }])
    expect(plan.items).toEqual([
      { kind: 'attach', answerFile: f('fiat-500.answer.jpg'), photoId: 'p1', answer: ' fiat 500 ' },
    ])
  })

  it('reports an unmatched answer file', () => {
    const plan = planUpload([f('ghost.answer.jpg')], [])
    expect(plan.items).toEqual([])
    expect(plan.errors).toEqual([
      { fileName: 'ghost.answer.jpg', reason: 'Немає фото «Ghost» для цього фото відповіді' },
    ])
  })

  it('rejects non-image files and keeps the order of the rest', () => {
    const plan = planUpload([f('b.png'), f('notes.txt'), f('a.jpeg'), f('photo.heic')], [])
    expect(plan.items.map((i) => i.answer)).toEqual(['B', 'A'])
    expect(plan.errors.map((e) => e.fileName)).toEqual(['notes.txt', 'photo.heic'])
  })
})
