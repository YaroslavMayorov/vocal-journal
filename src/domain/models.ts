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
  kind: 'audio'
  original: OriginalFileReference
  storageProvider: 'local' | 'b2'
  status: 'pending' | 'active' | 'recoverable' | 'failed'
  createdAt: ISODateTime
  verifiedAt: ISODateTime | null
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
  exerciseCount?: number
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface ExerciseTag {
  id: EntityId
  name: string
}

export interface Exercise extends RecoverableEntity {
  id: EntityId
  title: string
  notes: string
  plusMediaId: EntityId | null
  minusMediaId: EntityId | null
  plusMedia?: MediaFile | null
  minusMedia?: MediaFile | null
  tags: ExerciseTag[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export type SongStatus = 'learning' | 'learned' | 'postponed'

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  learning: 'Изучаю',
  learned: 'Выучена',
  postponed: 'Отложена',
}

export const SONG_STATUSES: SongStatus[] = ['learning', 'learned', 'postponed']

export type LyricsMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'highlight'; attrs: { color: string } }
  | { type: 'annotation'; attrs: { commentId: EntityId } }

export interface LyricsTextNode {
  type: 'text'
  text: string
  marks?: LyricsMark[]
}

export interface LyricsHardBreakNode {
  type: 'hardBreak'
}

export interface LyricsParagraphNode {
  type: 'paragraph'
  content?: Array<LyricsTextNode | LyricsHardBreakNode>
}

export interface LyricsDocument {
  type: 'doc'
  content: LyricsParagraphNode[]
}

export const EMPTY_LYRICS_DOCUMENT: LyricsDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export interface LyricsComment {
  id: EntityId
  songId: EntityId
  text: string
  quotedText: string
  isOrphaned: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface SongSummary {
  id: EntityId
  title: string
  artist: string
  status: SongStatus
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export interface Song extends SongSummary, RecoverableEntity {
  youtubeUrl: string | null
  minusMediaId: EntityId | null
  minusMedia?: MediaFile | null
  lyricsDocument: LyricsDocument
  lyricsComments: LyricsComment[]
}
