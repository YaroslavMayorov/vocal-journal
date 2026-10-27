import type { MediaFile } from '../src/domain/models'
import type { MediaRow, MediaSlot } from './types'

export function mapMedia(row: MediaRow): MediaFile {
  return {
    id: row.id,
    storageKey: row.storage_key,
    kind: 'audio',
    original: {
      fileName: row.original_filename,
      mimeType: row.content_type,
      sizeBytes: Number(row.size_bytes),
    },
    storageProvider: row.storage_provider,
    status: row.status,
    createdAt: row.created_at,
    verifiedAt: row.verified_at,
  }
}

export async function getMediaRow(
  db: D1Database,
  id: string,
): Promise<MediaRow | undefined> {
  return (
    (await db
      .prepare('SELECT * FROM media_files WHERE id = ?')
      .bind(id)
      .first<MediaRow>()) ?? undefined
  )
}

export async function getActiveMediaForExercise(
  db: D1Database,
  exerciseId: string,
  slot: Extract<MediaSlot, 'plus' | 'minus'>,
): Promise<MediaFile | null> {
  const row = await db
    .prepare(
      `SELECT * FROM media_files
       WHERE exercise_id = ? AND slot = ? AND status = 'active'`,
    )
    .bind(exerciseId, slot)
    .first<MediaRow>()
  return row ? mapMedia(row) : null
}

export async function getActiveMediaForSong(
  db: D1Database,
  songId: string,
): Promise<MediaFile | null> {
  const row = await db
    .prepare(
      `SELECT * FROM media_files
       WHERE song_id = ? AND slot = 'backing' AND status = 'active'`,
    )
    .bind(songId)
    .first<MediaRow>()
  return row ? mapMedia(row) : null
}
