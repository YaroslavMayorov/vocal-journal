export interface Env {
  DB: D1Database
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
