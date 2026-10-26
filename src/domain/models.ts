export type EntityId = string
export type ISODateTime = string

export interface RecoverableEntity {
  deletedAt?: ISODateTime
}

export interface OriginalFileReference {
  fileName: string
  mimeType: string
  sizeBytes: number
  lastModifiedAt?: ISODateTime
}

export interface MediaFile extends RecoverableEntity {
  id: EntityId
  storageKey: string
  url?: string
  kind: 'audio' | 'video'
  original: OriginalFileReference
  createdAt: ISODateTime
}

export interface TextRangeReference {
  start: number
  end: number
  quotedText: string
}

export interface Comment extends RecoverableEntity {
  id: EntityId
  text: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
  timestampSeconds?: number
  lyricsRange?: TextRangeReference
}

export interface Attempt extends RecoverableEntity {
  id: EntityId
  recording: MediaFile
  comments: Comment[]
  createdAt: ISODateTime
  notes?: string
}

export interface Tag extends RecoverableEntity {
  id: EntityId
  name: string
  color?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Exercise extends RecoverableEntity {
  id: EntityId
  title: string
  tagIds: EntityId[]
  plusAudio?: MediaFile
  minusAudio?: MediaFile
  teacherNotes: string
  attempts: Attempt[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type SongStatus = 'learning' | 'learned' | 'paused'

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  learning: 'Изучаю',
  learned: 'Выучена',
  paused: 'Отложена',
}

export interface Song extends RecoverableEntity {
  id: EntityId
  title: string
  status: SongStatus
  youtubePerformanceUrl?: string
  backingTrack?: MediaFile
  lyrics: string
  lyricsComments: Comment[]
  attempts: Attempt[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
