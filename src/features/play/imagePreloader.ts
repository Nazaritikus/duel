/** Decodes images ahead of time and keeps the last few alive so they display instantly. */
export interface ImagePreloader {
  /**
   * `priority` is the fetch priority of the first request for `src` (a cached image keeps
   * its request): `low` for look-ahead photos so they never compete with the one on screen.
   */
  preload(src: string, options?: { priority?: FetchPriority }): Promise<void>
}

type FetchPriority = 'high' | 'low' | 'auto'

interface PreloadImage {
  src: string
  decoding: string
  fetchPriority?: string
  decode?: () => Promise<void>
  onload: (() => void) | null
  onerror: (() => void) | null
}

export function createImagePreloader({
  createImage = () => new Image() as PreloadImage,
  capacity = 12,
}: { createImage?: () => PreloadImage; capacity?: number } = {}): ImagePreloader {
  // Insertion order doubles as recency: a hit is moved to the end.
  const cache = new Map<string, { image: PreloadImage; ready: Promise<void> }>()

  return {
    preload(src, { priority = 'auto' } = {}) {
      const hit = cache.get(src)
      if (hit) {
        cache.delete(src)
        cache.set(src, hit)
        return hit.ready
      }
      const image = createImage()
      image.decoding = 'async'
      image.fetchPriority = priority
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error(`Failed to load ${src}`))
      })
      image.src = src
      const ready = (image.decode ? image.decode() : loaded).catch((error: unknown) => {
        cache.delete(src)
        throw error
      })
      cache.set(src, { image, ready })
      while (cache.size > capacity) cache.delete(cache.keys().next().value!)
      return ready
    },
  }
}
