import type { PlayPhoto } from './types'

/**
 * Image URLs to have decoded while `photoIds[photoIndex]` is on screen: the current photo and
 * its answer photo, then the next `ahead` photos with their answer photos.
 */
export function upcomingSources(
  photoIds: readonly string[],
  photoIndex: number,
  photosById: ReadonlyMap<string, PlayPhoto>,
  ahead = 3,
): string[] {
  const sources: string[] = []
  for (let i = photoIndex; i <= photoIndex + ahead && i < photoIds.length; i++) {
    const photo = photosById.get(photoIds[i])
    if (!photo) continue
    sources.push(photo.src)
    if (photo.answerSrc) sources.push(photo.answerSrc)
  }
  return sources
}
