// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { convertV4MiniflareOptions, Miniflare } from 'miniflare'
import worker from './index'

interface ApiResponse<T> {
  data?: T
  error?: { code: string; message: string }
}

interface TestTag {
  id: string
  name: string
  exerciseCount: number
}

interface TestExercise {
  id: string
  title: string
  notes: string
  tags: Array<{ id: string; name: string }>
}

let miniflare: Miniflare | undefined
let db: Awaited<ReturnType<Miniflare['getD1Database']>>

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body?: ApiResponse<T> }> {
  const requestObject = new Request(`http://local.test${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  }) as unknown as Parameters<typeof worker.fetch>[0]
  const response = await worker.fetch(
    requestObject,
    { DB: db as unknown as D1Database },
  )
  const body = response.status === 204 ? undefined : ((await response.json()) as ApiResponse<T>)
  return { response, body }
}

async function createTag(name: string): Promise<TestTag> {
  const { body, response } = await request<TestTag>('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  expect(response.status).toBe(201)
  return body!.data!
}

async function createExercise(
  title: string,
  tagIds: string[] = [],
): Promise<TestExercise> {
  const { body, response } = await request<TestExercise>('/api/exercises', {
    method: 'POST',
    body: JSON.stringify({ title, notes: 'Заметка', tagIds }),
  })
  expect(response.status).toBe(201)
  return body!.data!
}

beforeEach(async () => {
  miniflare = new Miniflare(convertV4MiniflareOptions({
    compatibilityDate: '2026-10-26',
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { DB: 'vocal-journal-test' },
  }))
  db = await miniflare.getD1Database('DB')
  const migration = await readFile('migrations/0001_exercises_and_tags.sql', 'utf8')
  // Apply the same migration statement-by-statement because the current
  // Miniflare low-level exec parser treats every source line as separate SQL.
  for (const statement of migration
    .replace('PRAGMA foreign_keys = ON;', '')
    .split(';')
    .map((sql) => sql.trim())
    .filter(Boolean)) {
    await db.prepare(statement).run()
  }
})

afterEach(async () => {
  await miniflare?.dispose()
})

describe('API тегов', () => {
  it('создаёт тег и запрещает дубликат без учёта регистра', async () => {
    const tag = await createTag('  Дыхание  ')
    expect(tag.name).toBe('Дыхание')

    const duplicate = await request<TestTag>('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'дыхание' }),
    })
    expect(duplicate.response.status).toBe(409)
    expect(duplicate.body?.error?.code).toBe('TAG_NAME_EXISTS')
  })

  it('переименовывает тег, сохраняя связи', async () => {
    const tag = await createTag('Распевка')
    const exercise = await createExercise('Губная трель', [tag.id])

    const renamed = await request<TestTag>(`/api/tags/${tag.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Разминка' }),
    })
    const fetched = await request<TestExercise>(`/api/exercises/${exercise.id}`)

    expect(renamed.response.status).toBe(200)
    expect(renamed.body?.data?.name).toBe('Разминка')
    expect(fetched.body?.data?.tags).toEqual([{ id: tag.id, name: 'Разминка' }])
  })

  it('удаляет тег и его связи, но сохраняет упражнение', async () => {
    const tag = await createTag('Артикуляция')
    const exercise = await createExercise('Скороговорка', [tag.id])

    const deleted = await request<void>(`/api/tags/${tag.id}`, { method: 'DELETE' })
    const fetched = await request<TestExercise>(`/api/exercises/${exercise.id}`)

    expect(deleted.response.status).toBe(204)
    expect(fetched.response.status).toBe(200)
    expect(fetched.body?.data?.tags).toEqual([])
  })
})

describe('API упражнений', () => {
  it('создаёт и получает упражнение с несколькими тегами без дублей', async () => {
    const first = await createTag('Дыхание')
    const second = await createTag('Резонаторы')
    const exercise = await createExercise('  Сирена  ', [first.id, second.id, first.id])

    const fetched = await request<TestExercise>(`/api/exercises/${exercise.id}`)
    expect(fetched.response.status).toBe(200)
    expect(fetched.body?.data).toMatchObject({ title: 'Сирена', notes: 'Заметка' })
    expect(fetched.body?.data?.tags).toHaveLength(2)
  })

  it('обновляет поля и связи упражнения атомарно', async () => {
    const first = await createTag('Первый')
    const second = await createTag('Второй')
    const exercise = await createExercise('Старое название', [first.id])

    const updated = await request<TestExercise>(`/api/exercises/${exercise.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Новое название',
        notes: 'Новый комментарий',
        tagIds: [second.id],
      }),
    })

    expect(updated.response.status).toBe(200)
    expect(updated.body?.data).toMatchObject({
      title: 'Новое название',
      notes: 'Новый комментарий',
      tags: [{ id: second.id, name: 'Второй' }],
    })
  })

  it('проверяет обязательное название и существование тегов', async () => {
    const invalidTitle = await request<TestExercise>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({ title: '  ', notes: '', tagIds: [] }),
    })
    const unknownTag = await request<TestExercise>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Валидное',
        notes: '',
        tagIds: ['3cf38f9d-cff9-4666-b7ee-9e354ee4d008'],
      }),
    })

    expect(invalidTitle.response.status).toBe(422)
    expect(unknownTag.response.status).toBe(422)
    expect(unknownTag.body?.error?.code).toBe('UNKNOWN_TAG')
  })

  it('отличает некорректный id от отсутствующего ресурса', async () => {
    const invalid = await request<TestExercise>('/api/exercises/not-a-uuid')
    const missing = await request<TestExercise>(
      '/api/exercises/3cf38f9d-cff9-4666-b7ee-9e354ee4d008',
    )

    expect(invalid.response.status).toBe(400)
    expect(missing.response.status).toBe(404)
  })

  it('отклоняет некорректный JSON', async () => {
    const malformed = await request<TestExercise>('/api/exercises', {
      method: 'POST',
      body: '{broken',
    })

    expect(malformed.response.status).toBe(400)
    expect(malformed.body?.error?.code).toBe('MALFORMED_JSON')
  })
})
