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
