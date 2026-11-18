import type { TypedSupabaseClient } from '../../lib/supabase'
import type { CategorySource, PlayPhoto } from './types'

const PHOTOS_BUCKET = 'photos'
/** Long enough for an evening of rematches; choosing another category signs again. */
export const SIGNED_URL_TTL = 6 * 60 * 60

const defaultClient = () => import('../../lib/supabase').then((m) => m.getSupabase())

interface PhotoRow {
  id: string
  storage_path: string
  answer_storage_path: string | null
  answer: string
  is_vertical: boolean
  position: number
}

/**
 * Published categories from Supabase. The `published` filter is explicit: an admin signed in
 * on the same browser would otherwise see drafts through RLS.
 */
export function createSupabaseCategorySource(
  getClient: () => Promise<TypedSupabaseClient> = defaultClient,
): CategorySource {
  return {
    async listCategories() {
      const client = await getClient()
      const { data, error } = await client
        .from('categories')
        .select('id, name, photos(count)')
        .eq('status', 'published')
      if (error) throw error
      return (data as { id: string; name: string; photos: { count: number }[] }[])
        .map((c) => ({ id: c.id, name: c.name, photoCount: c.photos[0]?.count ?? 0 }))
        .filter((c) => c.photoCount > 0)
        .sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    },

    async loadCategory(id) {
      const client = await getClient()
      const { data, error } = await client
        .from('categories')
        .select(
          'id, name, photos(id, storage_path, answer_storage_path, answer, is_vertical, position)',
        )
        .eq('id', id)
        .eq('status', 'published')
        .single()
      if (error) throw error
      const category = data as { id: string; name: string; photos: PhotoRow[] }
      const rows = category.photos.toSorted((a, b) => a.position - b.position)

      const paths = rows.flatMap((r) =>
        r.answer_storage_path ? [r.storage_path, r.answer_storage_path] : [r.storage_path],
      )
      const urls = new Map<string, string>()
      if (paths.length) {
        const { data: signed, error: signError } = await client.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL)
        if (signError) throw signError
        for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl)
      }

      const photos: PlayPhoto[] = []
      for (const r of rows) {
        const src = urls.get(r.storage_path)
        if (!src) continue
        photos.push({
          id: r.id,
          src,
          answerSrc: (r.answer_storage_path && urls.get(r.answer_storage_path)) || null,
          answer: r.answer,
          isVertical: r.is_vertical,
        })
      }
      if (!photos.length) throw new Error(`Category ${id} has no playable photos`)
      return { id: category.id, name: category.name, photos }
    },
  }
}
