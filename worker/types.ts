export interface Env {
  DB: D1Database
  MEDIA_STORAGE_PROVIDER?: 'local' | 'b2'
  MEDIA_UPLOADS_ENABLED?: string
  LOCAL_MEDIA_BASE_URL?: string
  LOCAL_MEDIA_SIGNING_SECRET?: string
  B2_ENDPOINT?: string
  B2_REGION?: string
  B2_BUCKET?: string
  B2_KEY_ID?: string
  B2_APPLICATION_KEY?: string
}

export type MediaStatus = 'pending' | 'active' | 'recoverable' | 'failed'
export type MediaSlot = 'plus' | 'minus' | 'backing'

export interface MediaRow {
  id: string
  storage_key: string
  original_filename: string
  content_type: string
  size_bytes: number
  storage_provider: 'local' | 'b2'
  status: MediaStatus
  exercise_id: string | null
  song_id: string | null
  slot: MediaSlot
  replaces_media_id: string | null
  created_at: string
  verified_at: string | null
}

export interface ExerciseRow {
  id: string
  title: string
  notes: string
  plus_media_id: string | null
  minus_media_id: string | null
  created_at: string
  updated_at: string
}

export interface ExerciseWithTagRow extends ExerciseRow {
  tag_id: string | null
  tag_name: string | null
}

export interface TagRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface TagWithCountRow extends TagRow {
  exercise_count: number
}

export interface SongRow {
  id: string
  title: string
  artist: string
  status: 'learning' | 'learned' | 'postponed'
  youtube_url: string | null
  minus_media_id: string | null
  lyrics_document: string
  created_at: string
  updated_at: string
}

export interface LyricsCommentRow {
  id: string
  song_id: string
  text: string
  quoted_text: string
  created_at: string
  updated_at: string
}
