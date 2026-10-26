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
import { exerciseInputSchema, tagInputSchema, uuidSchema } from './validation'

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
  if (parts.length > 3 || !['exercises', 'tags'].includes(resource ?? '')) {
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
    return error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
  }

  const id = validateId(rawId)
  if (id instanceof Response) return id

  if (resource === 'exercises' && request.method === 'GET') {
    return handleGetExercise(env, id)
  }
  if (resource === 'exercises' && request.method === 'PUT') {
    return handleUpdateExercise(request, env, id)
  }
  if (resource === 'tags' && request.method === 'PUT') {
    return handleUpdateTag(request, env, id)
  }
  if (resource === 'tags' && request.method === 'DELETE') {
    return handleDeleteTag(env, id)
  }

  return error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается')
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
