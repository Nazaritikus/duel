import { describe, expect, it, vi } from 'vitest'
import { createImagePreloader } from './imagePreloader'
import { upcomingSources } from './preloadPlan'
import type { PlayPhoto } from './types'

function fakeImages(fail: (src: string) => boolean = () => false) {
  const created: { src: string; decode: ReturnType<typeof vi.fn> }[] = []
  const createImage = () => {
    const image = {
      src: '',
      decoding: '',
      onload: null,
      onerror: null,
      decode: vi.fn(async () => {
        if (fail(image.src)) throw new Error('bad')
      }),
    }
    created.push(image)
    return image
  }
  return { created, createImage }
}

describe('createImagePreloader', () => {
  it('decodes once per src and reuses the cached image', async () => {
    const { created, createImage } = fakeImages()
    const preloader = createImagePreloader({ createImage })
    await preloader.preload('a')
    await preloader.preload('a')
    expect(created).toHaveLength(1)
    expect(created[0].src).toBe('a')
    expect(created[0].decode).toHaveBeenCalledTimes(1)
  })

  it('evicts the least recently used image beyond capacity', async () => {
    const { created, createImage } = fakeImages()
    const preloader = createImagePreloader({ createImage, capacity: 2 })
    await preloader.preload('a')
    await preloader.preload('b')
    await preloader.preload('a') // a is now the most recent
    await preloader.preload('c') // evicts b
    await preloader.preload('a')
    expect(created.map((i) => i.src)).toEqual(['a', 'b', 'c'])
    await preloader.preload('b')
    expect(created.map((i) => i.src)).toEqual(['a', 'b', 'c', 'b'])
  })

  it('forgets a failed image so it can be retried', async () => {
    let broken = true
    const { created, createImage } = fakeImages(() => broken)
    const preloader = createImagePreloader({ createImage })
    await expect(preloader.preload('x')).rejects.toThrow('bad')
    broken = false
    await preloader.preload('x')
    expect(created).toHaveLength(2)
  })
})

describe('upcomingSources', () => {
  const photo = (id: string, answer = false): PlayPhoto => ({
    id,
    src: `${id}.webp`,
    answerSrc: answer ? `${id}.answer.webp` : null,
    answer: id,
    isVertical: false,
  })
  const photos = [photo('a', true), photo('b'), photo('c', true), photo('d'), photo('e')]
  const byId = new Map(photos.map((p) => [p.id, p]))
  const order = ['a', 'b', 'c', 'd', 'e']

  it('lists the current photo and the next ones with their answer photos', () => {
    expect(upcomingSources(order, 0, byId, 2)).toEqual([
      'a.webp',
      'a.answer.webp',
      'b.webp',
      'c.webp',
      'c.answer.webp',
    ])
  })

  it('stops at the end of the list', () => {
    expect(upcomingSources(order, 3, byId)).toEqual(['d.webp', 'e.webp'])
  })
})
