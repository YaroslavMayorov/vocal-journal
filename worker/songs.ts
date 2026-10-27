import type {
  LyricsComment,
  LyricsDocument,
  Song,
  SongSummary,
} from '../src/domain/models'
import { getAnnotationIds, lyricsDocumentSchema } from './lyrics'
import { getActiveMediaForSong } from './media-data'
import type { LyricsCommentRow, SongRow } from './types'

function parseLyricsDocument(value: string): LyricsDocument {
  return lyricsDocumentSchema.parse(JSON.parse(value))
}

function mapSongSummary(row: SongRow): SongSummary {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapComment(
  row: LyricsCommentRow,
  annotationIds: Set<string>,
): LyricsComment {
  return {
    id: row.id,
    songId: row.song_id,
    text: row.text,
    quotedText: row.quoted_text,
    isOrphaned: !annotationIds.has(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listSongs(db: D1Database): Promise<SongSummary[]> {
  const result = await db
    .prepare(
      `SELECT id, title, artist, status, youtube_url, minus_media_id,
              lyrics_document, created_at, updated_at
       FROM songs
       ORDER BY created_at ASC, id ASC`,
    )
    .all<SongRow>()

  return result.results.map(mapSongSummary)
}

export async function getSong(
  db: D1Database,
  id: string,
): Promise<Song | undefined> {
  const row = await db
    .prepare(
      `SELECT id, title, artist, status, youtube_url, minus_media_id,
              lyrics_document, created_at, updated_at
       FROM songs WHERE id = ?`,
    )
    .bind(id)
    .first<SongRow>()

  if (!row) return undefined

  const lyricsDocument = parseLyricsDocument(row.lyrics_document)
  const annotationIds = getAnnotationIds(lyricsDocument)
  const comments = await db
    .prepare(
      `SELECT id, song_id, text, quoted_text, created_at, updated_at
       FROM lyrics_comments
       WHERE song_id = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .bind(id)
    .all<LyricsCommentRow>()
  const minusMedia = await getActiveMediaForSong(db, id)

  return {
    ...mapSongSummary(row),
    youtubeUrl: row.youtube_url,
    minusMediaId: row.minus_media_id,
    minusMedia,
    lyricsDocument,
    lyricsComments: comments.results.map((comment) =>
      mapComment(comment, annotationIds),
    ),
  }
}

export async function getSongCommentIds(
  db: D1Database,
  songId: string,
): Promise<Set<string>> {
  const result = await db
    .prepare('SELECT id FROM lyrics_comments WHERE song_id = ?')
    .bind(songId)
    .all<{ id: string }>()
  return new Set(result.results.map((row) => row.id))
}
