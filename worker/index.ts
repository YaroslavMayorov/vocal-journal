import type { Tag } from '../src/domain/models'
import {
  getExercise,
  listExercises,
  listTags,
  mapTag,
  validateTagIds,
} from './data'
import { error, json, validationError } from './responses'
import type { Env, TagRow } from './types'
import { getAnnotationIds } from './lyrics'
import { getSong, getSongCommentIds, listSongs } from './songs'
import {
  exerciseInputSchema,
  lyricsCommentCreateSchema,
  lyricsCommentUpdateSchema,
  lyricsUpdateSchema,
  songCreateSchema,
  songMetadataSchema,
  tagInputSchema,
  uuidSchema,
} from './validation'

function normalizeTagName(name: string): string {
  return name.toLocaleLowerCase('ru')
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new SyntaxError('MALFORMED_JSON')
  }
}

function validateId(rawId: string): string | Response {
  const result = uuidSchema.safeParse(rawId)
  return result.success
    ? result.data
    : error(400, 'INVALID_ID', 'Некорректный идентификатор')
}

async function tagNameExists(
  db: D1Database,
  normalizedName: string,
  excludedId?: string,
): Promise<boolean> {
  const statement = excludedId
    ? db
        .prepare('SELECT id FROM tags WHERE normalized_name = ? AND id != ?')
        .bind(normalizedName, excludedId)
    : db.prepare('SELECT id FROM tags WHERE normalized_name = ?').bind(normalizedName)

  return (await statement.first<{ id: string }>()) !== null
}

async function handleListExercises(env: Env): Promise<Response> {
  return json(await listExercises(env.DB))
}

async function handleGetExercise(env: Env, id: string): Promise<Response> {
  const exercise = await getExercise(env.DB, id)
  return exercise
    ? json(exercise)
    : error(404, 'EXERCISE_NOT_FOUND', 'Упражнение не найдено')
}

async function handleCreateExercise(
  request: Request,
  env: Env,
): Promise<Response> {
  const validation = exerciseInputSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { notes, tagIds, title } = validation.data
  if (!(await validateTagIds(env.DB, tagIds))) {
    return error(422, 'UNKNOWN_TAG', 'Один или несколько тегов не найдены')
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const statements = [
    env.DB.prepare(
      `INSERT INTO exercises
       (id, title, notes, plus_media_id, minus_media_id, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?)`,
    ).bind(id, title, notes, now, now),
    ...tagIds.map((tagId) =>
      env.DB.prepare(
        `INSERT INTO exercise_tags (exercise_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
      ).bind(id, tagId, now),
    ),
  ]

  await env.DB.batch(statements)
  return json(await getExercise(env.DB, id), 201)
}

async function handleUpdateExercise(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  if (!(await getExercise(env.DB, id))) {
    return error(404, 'EXERCISE_NOT_FOUND', 'Упражнение не найдено')
  }

  const validation = exerciseInputSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { notes, tagIds, title } = validation.data
  if (!(await validateTagIds(env.DB, tagIds))) {
    return error(422, 'UNKNOWN_TAG', 'Один или несколько тегов не найдены')
  }

  const now = new Date().toISOString()
  const statements = [
    env.DB.prepare(
      'UPDATE exercises SET title = ?, notes = ?, updated_at = ? WHERE id = ?',
    ).bind(title, notes, now, id),
    env.DB.prepare('DELETE FROM exercise_tags WHERE exercise_id = ?').bind(id),
    ...tagIds.map((tagId) =>
      env.DB.prepare(
        `INSERT INTO exercise_tags (exercise_id, tag_id, created_at)
         VALUES (?, ?, ?)`,
      ).bind(id, tagId, now),
    ),
  ]

  await env.DB.batch(statements)
  return json(await getExercise(env.DB, id))
}

async function handleListTags(env: Env): Promise<Response> {
  return json(await listTags(env.DB))
}

async function handleCreateTag(request: Request, env: Env): Promise<Response> {
  const validation = tagInputSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { name } = validation.data
  const normalizedName = normalizeTagName(name)
  if (await tagNameExists(env.DB, normalizedName)) {
    return error(409, 'TAG_NAME_EXISTS', 'Тег с таким названием уже существует')
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO tags (id, name, normalized_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, name, normalizedName, now, now)
    .run()

  const row = await env.DB.prepare(
    'SELECT id, name, created_at, updated_at FROM tags WHERE id = ?',
  )
    .bind(id)
    .first<TagRow>()

  return json({ ...mapTag(row!), exerciseCount: 0 }, 201)
}

async function handleUpdateTag(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  const existing = await env.DB.prepare('SELECT id FROM tags WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()
  if (!existing) return error(404, 'TAG_NOT_FOUND', 'Тег не найден')

  const validation = tagInputSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { name } = validation.data
  const normalizedName = normalizeTagName(name)
  if (await tagNameExists(env.DB, normalizedName, id)) {
    return error(409, 'TAG_NAME_EXISTS', 'Тег с таким названием уже существует')
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE tags SET name = ?, normalized_name = ?, updated_at = ? WHERE id = ?',
  )
    .bind(name, normalizedName, now, id)
    .run()

  const tags = await listTags(env.DB)
  return json(tags.find((tag) => tag.id === id) as Tag)
}

// Authentication is intentionally absent in Task 2. Keeping this decision in
// one function makes the future Cloudflare Access owner check explicit without
// suggesting that the endpoint is protected today.
function canDeleteTag(): boolean {
  return true
}

async function handleDeleteTag(
  env: Env,
  id: string,
): Promise<Response> {
  if (!canDeleteTag()) {
    return error(403, 'FORBIDDEN', 'Удалять теги может только владелец')
  }

  const existing = await env.DB.prepare('SELECT id FROM tags WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()
  if (!existing) return error(404, 'TAG_NOT_FOUND', 'Тег не найден')

  await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run()
  return new Response(null, { status: 204 })
}

async function handleListSongs(env: Env): Promise<Response> {
  return json(await listSongs(env.DB))
}

async function handleGetSong(env: Env, id: string): Promise<Response> {
  const song = await getSong(env.DB, id)
  return song ? json(song) : error(404, 'SONG_NOT_FOUND', 'Песня не найдена')
}

async function handleCreateSong(request: Request, env: Env): Promise<Response> {
  const validation = songCreateSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { artist, lyricsDocument, status, title, youtubeUrl } = validation.data
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await env.DB.prepare(
    `INSERT INTO songs
     (id, title, artist, status, youtube_url, minus_media_id,
      lyrics_document, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
  )
    .bind(
      id,
      title,
      artist,
      status,
      youtubeUrl,
      JSON.stringify(lyricsDocument),
      now,
      now,
    )
    .run()

  return json(await getSong(env.DB, id), 201)
}

async function handleUpdateSong(
  request: Request,
  env: Env,
  id: string,
): Promise<Response> {
  if (!(await getSong(env.DB, id))) {
    return error(404, 'SONG_NOT_FOUND', 'Песня не найдена')
  }

  const validation = songMetadataSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { artist, status, title, youtubeUrl } = validation.data
  const now = new Date().toISOString()
  await env.DB.prepare(
    `UPDATE songs
     SET title = ?, artist = ?, status = ?, youtube_url = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(title, artist, status, youtubeUrl, now, id)
    .run()

  return json(await getSong(env.DB, id))
}

async function validateDocumentCommentIds(
  db: D1Database,
  songId: string,
  annotationIds: Set<string>,
  permittedNewId?: string,
): Promise<boolean> {
  const existingIds = await getSongCommentIds(db, songId)
  return [...annotationIds].every(
    (id) => id === permittedNewId || existingIds.has(id),
  )
}

async function handleUpdateLyrics(
  request: Request,
  env: Env,
  songId: string,
): Promise<Response> {
  if (!(await getSong(env.DB, songId))) {
    return error(404, 'SONG_NOT_FOUND', 'Песня не найдена')
  }

  const validation = lyricsUpdateSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const annotationIds = getAnnotationIds(validation.data.lyricsDocument)
  if (!(await validateDocumentCommentIds(env.DB, songId, annotationIds))) {
    return error(
      422,
      'UNKNOWN_ANNOTATION',
      'Текст содержит неизвестную аннотацию',
    )
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    'UPDATE songs SET lyrics_document = ?, updated_at = ? WHERE id = ?',
  )
    .bind(JSON.stringify(validation.data.lyricsDocument), now, songId)
    .run()

  return json(await getSong(env.DB, songId))
}

async function handleCreateLyricsComment(
  request: Request,
  env: Env,
  songId: string,
): Promise<Response> {
  if (!(await getSong(env.DB, songId))) {
    return error(404, 'SONG_NOT_FOUND', 'Песня не найдена')
  }

  const validation = lyricsCommentCreateSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  const { id, lyricsDocument, quotedText, text } = validation.data
  const annotationIds = getAnnotationIds(lyricsDocument)
  if (!annotationIds.has(id)) {
    return error(
      422,
      'ANNOTATION_MARK_MISSING',
      'Выбранный фрагмент не содержит идентификатор комментария',
    )
  }
  if (!(await validateDocumentCommentIds(env.DB, songId, annotationIds, id))) {
    return error(
      422,
      'UNKNOWN_ANNOTATION',
      'Текст содержит неизвестную аннотацию',
    )
  }

  const duplicate = await env.DB.prepare('SELECT id FROM lyrics_comments WHERE id = ?')
    .bind(id)
    .first<{ id: string }>()
  if (duplicate) {
    return error(409, 'COMMENT_ID_EXISTS', 'Комментарий уже существует')
  }

  const now = new Date().toISOString()
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE songs SET lyrics_document = ?, updated_at = ? WHERE id = ?',
    ).bind(JSON.stringify(lyricsDocument), now, songId),
    env.DB.prepare(
      `INSERT INTO lyrics_comments
       (id, song_id, text, quoted_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(id, songId, text, quotedText, now, now),
  ])

  return json(await getSong(env.DB, songId), 201)
}

async function handleUpdateLyricsComment(
  request: Request,
  env: Env,
  songId: string,
  commentId: string,
): Promise<Response> {
  const existing = await env.DB.prepare(
    'SELECT id FROM lyrics_comments WHERE id = ? AND song_id = ?',
  )
    .bind(commentId, songId)
    .first<{ id: string }>()
  if (!existing) {
    return error(404, 'COMMENT_NOT_FOUND', 'Комментарий не найден')
  }

  const validation = lyricsCommentUpdateSchema.safeParse(await parseJson(request))
  if (!validation.success) return validationError(validation.error)

  await env.DB.prepare(
    'UPDATE lyrics_comments SET text = ?, updated_at = ? WHERE id = ?',
  )
    .bind(validation.data.text, new Date().toISOString(), commentId)
    .run()

  return json(await getSong(env.DB, songId))
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)

  if (parts[0] !== 'api') {
    return error(404, 'NOT_FOUND', 'Маршрут не найден')
  }

  if (parts.length === 1 && request.method === 'GET') {
    return json({ service: 'Vocal Journal API' })
  }

  const resource = parts[1]
  const rawId = parts[2]
  if (!['exercises', 'tags', 'songs'].includes(resource ?? '')) {
    return error(404, 'NOT_FOUND', 'Маршрут не найден')
  }

  if (!rawId) {
    if (resource === 'exercises' && request.method === 'GET') {
      return handleListExercises(env)
    }
    if (resource === 'exercises' && request.method === 'POST') {
      return handleCreateExercise(request, env)
    }
    if (resource === 'tags' && request.method === 'GET') {
      return handleListTags(env)
    }
    if (resource === 'tags' && request.method === 'POST') {
      return handleCreateTag(request, env)
    }
    if (resource === 'songs' && request.method === 'GET') {
      return handleListSongs(env)
    }
    if (resource === 'songs' && request.method === 'POST') {
      return handleCreateSong(request, env)
    }
    return error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
  }

  const id = validateId(rawId)
  if (id instanceof Response) return id

  if (resource === 'exercises' && parts.length === 3 && request.method === 'GET') {
    return handleGetExercise(env, id)
  }
  if (resource === 'exercises' && parts.length === 3 && request.method === 'PUT') {
    return handleUpdateExercise(request, env, id)
  }
  if (resource === 'tags' && parts.length === 3 && request.method === 'PUT') {
    return handleUpdateTag(request, env, id)
  }
  if (resource === 'tags' && parts.length === 3 && request.method === 'DELETE') {
    return handleDeleteTag(env, id)
  }
  if (resource === 'songs' && parts.length === 3 && request.method === 'GET') {
    return handleGetSong(env, id)
  }
  if (resource === 'songs' && parts.length === 3 && request.method === 'PUT') {
    return handleUpdateSong(request, env, id)
  }
  if (resource === 'songs' && parts[3] === 'lyrics' && parts.length === 4) {
    return request.method === 'PUT'
      ? handleUpdateLyrics(request, env, id)
      : error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
  }
  if (resource === 'songs' && parts[3] === 'comments' && parts.length === 4) {
    return request.method === 'POST'
      ? handleCreateLyricsComment(request, env, id)
      : error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
  }
  if (resource === 'songs' && parts[3] === 'comments' && parts.length === 5) {
    const commentId = validateId(parts[4] ?? '')
    if (commentId instanceof Response) return commentId
    return request.method === 'PUT'
      ? handleUpdateLyricsComment(request, env, id, commentId)
      : error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
  }

  return parts.length > 3
    ? error(404, 'NOT_FOUND', 'Маршрут не найден')
    : error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await route(request, env)
    } catch (caught) {
      if (caught instanceof SyntaxError && caught.message === 'MALFORMED_JSON') {
        return error(400, 'MALFORMED_JSON', 'Некорректный JSON')
      }

      console.error('Unhandled API error', caught)
      return error(500, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера')
    }
  },
} satisfies ExportedHandler<Env>
