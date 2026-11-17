/** Client-side image compression for uploads (spec: about 1600 px, WebP). */

export const MAX_SIDE = 1600
const QUALITY = 0.85

export interface ProcessedImage {
  blob: Blob
  ext: 'webp' | 'jpg'
  width: number
  height: number
}

export type ImageCompressor = (file: Blob) => Promise<ProcessedImage>

/** Scales (w, h) down so the longer side is at most `max`; never scales up. */
export function targetSize(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export const isVerticalImage = (image: { width: number; height: number }) =>
  image.height > image.width

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/** Decodes (applying EXIF orientation), resizes and encodes as WebP, or JPEG as a fallback. */
export const compressImage: ImageCompressor = async (file) => {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Не вдалося прочитати зображення')
  }
  const { width, height } = targetSize(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Браузер не може обробити зображення')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const webp = await toBlob(canvas, 'image/webp')
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp', width, height }
  const jpeg = await toBlob(canvas, 'image/jpeg')
  if (!jpeg) throw new Error('Не вдалося стиснути зображення')
  return { blob: jpeg, ext: 'jpg', width, height }
}
