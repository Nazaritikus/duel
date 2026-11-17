/** A photo as the play screen needs it; phase 8 loads the same shape from Supabase. */
export interface PlayPhoto {
  id: string
  src: string
  /** Shown instead of the question photo during feedback, when present. */
  answerSrc: string | null
  answer: string
  isVertical: boolean
}

export interface PlayCategory {
  id: string
  name: string
  photos: PlayPhoto[]
}

export type PlayerNames = readonly [string, string]
