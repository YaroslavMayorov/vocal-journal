import { getExercise } from './data'
import { mapMedia, getMediaRow } from './media-data'
import {
  extensionFor,
  mediaUploadSchema,
  type MediaUploadInput,
  uploadVerificationSchema,
} from './media-validation'
import { error, json, validationError } from './responses'
import { getSong } from './songs'
import {
  getStorageProvider,
  StorageObjectMissingError,
  StorageProviderError,
  type StorageProvider,
} from './storage'
import type { Env, MediaRow } from './types'
import { uuidSchema } from './validation'

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new SyntaxError('MALFORMED_JSON')
  }
}

async function ownerExists(
  env: Env,
  input: MediaUploadInput,
): Promise<boolean> {
  return input.ownerType === 'exercise'
    ? Boolean(await getExercise(env.DB, input.ownerId))
    : Boolean(await getSong(env.DB, input.ownerId))
}

async function currentActiveMediaId(
  env: Env,
  input: MediaUploadInput,
): Promise<string | null> {
  const ownerColumn = input.ownerType === 'exercise' ? 'exercise_id' : 'song_id'
  const row = await env.DB.prepare(
    `SELECT id FROM media_files
     WHERE ${ownerColumn} = ? AND slot = ? AND status = 'active'`,
  )
    .bind(input.ownerId, input.slot)
    .first<{ id: string }>()
  return row?.id ?? null
}

function storageKey(id: string, extension: string, now: Date): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `media/${year}/${month}/${id}.${extension}`
}

export async function authorizeMediaUpload(
  request: Request,
  env: Env,
): Promise<Response> {
  if (env.MEDIA_UPLOADS_ENABLED !== 'true') {
    return error(
      503,
      'MEDIA_UPLOADS_DISABLED',
      'Загрузка медиа отключена до настройки защищённого доступа',
    )
  }

  const validation = mediaUploadSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)
  const input = validation.data
  if (!(await ownerExists(env, input))) {
    return error(404, 'MEDIA_OWNER_NOT_FOUND', 'Связанный материал не найден')
  }

  const id = crypto.randomUUID()
  const now = new Date()
  let provider: StorageProvider
  let authorization
  try {
    provider = getStorageProvider(env)
    authorization = await provider.authorizeUpload(
      storageKey(id, extensionFor(input.originalFilename), now),
      input.contentType,
    )
  } catch {
    return error(
      503,
      'STORAGE_UNAVAILABLE',
      'Медиахранилище временно недоступно',
    )
  }

  const key = storageKey(id, extensionFor(input.originalFilename), now)
  const replacesMediaId = await currentActiveMediaId(env, input)
  await env.DB.prepare(
    `INSERT INTO media_files
     (id, storage_key, original_filename, content_type, size_bytes,
      storage_provider, status, exercise_id, song_id, slot,
      replaces_media_id, created_at, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(
      id,
      key,
      input.originalFilename,
      input.contentType,
      input.sizeBytes,
      provider.name,
      input.ownerType === 'exercise' ? input.ownerId : null,
      input.ownerType === 'song' ? input.ownerId : null,
      input.slot,
      replacesMediaId,
      now.toISOString(),
    )
    .run()

  return json(
    {
      mediaId: id,
      uploadUrl: authorization.uploadUrl,
      headers: authorization.headers,
      expiresAt: authorization.expiresAt,
    },
    201,
  )
}

function metadataMatches(row: MediaRow, sizeBytes: number, contentType: string) {
  return (
    Number(row.size_bytes) === sizeBytes &&
    row.content_type === contentType.toLowerCase().split(';')[0]
  )
}

export async function finalizeMediaUpload(
  request: Request,
  env: Env,
  rawMediaId: string,
): Promise<Response> {
  if (env.MEDIA_UPLOADS_ENABLED !== 'true') {
    return error(
      503,
      'MEDIA_UPLOADS_DISABLED',
      'Загрузка медиа отключена до настройки защищённого доступа',
    )
  }
  const idValidation = uuidSchema.safeParse(rawMediaId)
  if (!idValidation.success) {
    return error(400, 'INVALID_ID', 'Некорректный идентификатор')
  }
  const row = await getMediaRow(env.DB, idValidation.data)
  if (!row) return error(404, 'MEDIA_NOT_FOUND', 'Медиафайл не найден')
  if (row.status !== 'pending') {
    return error(409, 'MEDIA_ALREADY_FINALIZED', 'Загрузка уже завершена')
  }

  const verification = uploadVerificationSchema.safeParse(await parseJson(request))
  if (!verification.success) return validationError(verification.error)

  let objectMetadata
  try {
    objectMetadata = await getStorageProvider(
      env,
      row.storage_provider,
    ).inspect(row.storage_key, verification.data)
  } catch (caught) {
    if (caught instanceof StorageObjectMissingError) {
      return error(
        409,
        'UPLOAD_NOT_FOUND',
        'Файл не найден в хранилище. Повторите загрузку.',
      )
    }
    if (
      caught instanceof StorageProviderError &&
      ['UPLOAD_RECEIPT_REQUIRED', 'INVALID_UPLOAD_RECEIPT'].includes(
        caught.message,
      )
    ) {
      return error(
        422,
        'UPLOAD_NOT_VERIFIED',
        'Локальное хранилище не подтвердило загрузку файла',
      )
    }
    return error(
      503,
      'STORAGE_UNAVAILABLE',
      'Не удалось проверить загруженный файл',
    )
  }

  if (
    !metadataMatches(row, objectMetadata.sizeBytes, objectMetadata.contentType)
  ) {
    await env.DB.prepare(
      "UPDATE media_files SET status = 'failed' WHERE id = ?",
    )
      .bind(row.id)
      .run()
    return error(
      422,
      'UPLOAD_METADATA_MISMATCH',
      'Размер или тип загруженного файла не совпадает с ожидаемым',
    )
  }

  const now = new Date().toISOString()
  const ownerColumn = row.exercise_id ? 'exercise_id' : 'song_id'
  const ownerId = row.exercise_id ?? row.song_id!
  const statements = [
    env.DB.prepare(
      `UPDATE media_files SET status = 'recoverable'
       WHERE ${ownerColumn} = ? AND slot = ? AND status = 'active'`,
    ).bind(ownerId, row.slot),
    env.DB.prepare(
      "UPDATE media_files SET status = 'active', verified_at = ? WHERE id = ?",
    ).bind(now, row.id),
  ]
  if (row.exercise_id) {
    const column = row.slot === 'plus' ? 'plus_media_id' : 'minus_media_id'
    statements.push(
      env.DB.prepare(
        `UPDATE exercises SET ${column} = ?, updated_at = ? WHERE id = ?`,
      ).bind(row.id, now, row.exercise_id),
    )
  } else {
    statements.push(
      env.DB.prepare(
        'UPDATE songs SET minus_media_id = ?, updated_at = ? WHERE id = ?',
      ).bind(row.id, now, row.song_id),
    )
  }
  await env.DB.batch(statements)

  const activeRow = await getMediaRow(env.DB, row.id)
  return json(mapMedia(activeRow!))
}

export async function getMediaAccess(
  env: Env,
  rawMediaId: string,
): Promise<Response> {
  const idValidation = uuidSchema.safeParse(rawMediaId)
  if (!idValidation.success) {
    return error(400, 'INVALID_ID', 'Некорректный идентификатор')
  }
  const row = await getMediaRow(env.DB, idValidation.data)
  if (!row || !['active', 'recoverable'].includes(row.status)) {
    return error(404, 'MEDIA_NOT_FOUND', 'Медиафайл не найден')
  }
  try {
    return json(
      await getStorageProvider(env, row.storage_provider).createAccess(
        row.storage_key,
        row.original_filename,
      ),
    )
  } catch (caught) {
    if (caught instanceof StorageProviderError) {
      return error(
        503,
        'STORAGE_UNAVAILABLE',
        'Медиахранилище временно недоступно',
      )
    }
    throw caught
  }
}
