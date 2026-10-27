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

interface TestLyricsDocument {
  type: 'doc'
  content: Array<{
    type: 'paragraph'
    content?: Array<{
      type: 'text' | 'hardBreak'
      text?: string
      marks?: Array<{ type: string; attrs?: Record<string, string> }>
    }>
  }>
}

interface TestSong {
  id: string
  title: string
  artist: string
  status: 'learning' | 'learned' | 'postponed'
  youtubeUrl: string | null
  lyricsDocument: TestLyricsDocument
  lyricsComments: Array<{
    id: string
    text: string
    quotedText: string
    isOrphaned: boolean
  }>
  createdAt: string
  updatedAt: string
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

async function createSong(
  title: string,
  overrides: Record<string, unknown> = {},
): Promise<TestSong> {
  const { body, response } = await request<TestSong>('/api/songs', {
    method: 'POST',
    body: JSON.stringify({ title, ...overrides }),
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
  for (const file of [
    'migrations/0001_exercises_and_tags.sql',
    'migrations/0002_songs_and_lyrics_comments.sql',
  ]) {
    const migration = await readFile(file, 'utf8')
    // Apply the same migrations statement-by-statement because the current
    // Miniflare low-level exec parser treats every source line as separate SQL.
    for (const statement of migration
      .replace('PRAGMA foreign_keys = ON;', '')
      .split(';')
      .map((sql) => sql.trim())
      .filter(Boolean)) {
      await db.prepare(statement).run()
    }
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

describe('API песен', () => {
  it('создаёт песню с безопасными значениями по умолчанию и проверяет название', async () => {
    const song = await createSong('  Human  ', {
      youtubeUrl: 'https://youtu.be/L3wKzyIN1yk?t=10',
    })

    expect(song).toMatchObject({
      title: 'Human',
      artist: '',
      status: 'learning',
      youtubeUrl: 'https://www.youtube.com/watch?v=L3wKzyIN1yk',
      lyricsComments: [],
    })
    expect(song.lyricsDocument).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })

    const invalid = await request<TestSong>('/api/songs', {
      method: 'POST',
      body: JSON.stringify({ title: '   ' }),
    })
    expect(invalid.response.status).toBe(422)
  })

  it('редактирует метаданные и статус песни', async () => {
    const song = await createSong('Старое название')
    const updated = await request<TestSong>(`/api/songs/${song.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Новое название',
        artist: 'Исполнитель',
        status: 'learned',
        youtubeUrl: '',
      }),
    })

    expect(updated.response.status).toBe(200)
    expect(updated.body?.data).toMatchObject({
      title: 'Новое название',
      artist: 'Исполнитель',
      status: 'learned',
      youtubeUrl: null,
    })
  })

  it('возвращает песни от старых к новым с детерминированным порядком', async () => {
    const later = await createSong('Позже')
    const earlier = await createSong('Раньше')
    await db.prepare('UPDATE songs SET created_at = ? WHERE id = ?')
      .bind('2026-02-02T00:00:00.000Z', later.id)
      .run()
    await db.prepare('UPDATE songs SET created_at = ? WHERE id = ?')
      .bind('2026-01-01T00:00:00.000Z', earlier.id)
      .run()

    const listed = await request<TestSong[]>('/api/songs')
    expect(listed.body?.data?.map((song) => song.title)).toEqual([
      'Раньше',
      'Позже',
    ])
  })

  it('различает некорректный и отсутствующий идентификатор песни', async () => {
    const invalid = await request<TestSong>('/api/songs/not-a-uuid')
    const missing = await request<TestSong>(
      '/api/songs/3cf38f9d-cff9-4666-b7ee-9e354ee4d008',
    )

    expect(invalid.response.status).toBe(400)
    expect(missing.response.status).toBe(404)
  })

  it('сохраняет форматирование, абзацы и переносы текста', async () => {
    const song = await createSong('Текстовая песня')
    const document: TestLyricsDocument = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Первая', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            {
              type: 'text',
              text: 'строка',
              marks: [{ type: 'highlight', attrs: { color: '#fef08a' } }],
            },
          ],
        },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Куплет', marks: [{ type: 'italic' }] }],
        },
      ],
    }

    const updated = await request<TestSong>(`/api/songs/${song.id}/lyrics`, {
      method: 'PUT',
      body: JSON.stringify({ lyricsDocument: document }),
    })
    expect(updated.response.status).toBe(200)
    expect(updated.body?.data?.lyricsDocument).toEqual(document)

    const invalid = await request<TestSong>(`/api/songs/${song.id}/lyrics`, {
      method: 'PUT',
      body: JSON.stringify({
        lyricsDocument: { type: 'doc', content: [{ type: 'heading' }] },
      }),
    })
    expect(invalid.response.status).toBe(422)
  })

  it('создаёт несколько комментариев и редактирует их текст', async () => {
    const song = await createSong('Комментарии')
    const firstId = '2f5a48d9-2e31-47f0-87ed-11e67143b003'
    const secondId = '5d170679-4bf8-45f1-863d-94f737e88724'
    const document: TestLyricsDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Слово', marks: [{ type: 'annotation', attrs: { commentId: firstId } }] },
          { type: 'text', text: ' и ' },
          { type: 'text', text: 'фраза', marks: [{ type: 'annotation', attrs: { commentId: secondId } }] },
        ],
      }],
    }

    const first = await request<TestSong>(`/api/songs/${song.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        id: firstId,
        text: 'Мягче',
        quotedText: 'Слово',
        lyricsDocument: {
          ...document,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Слово', marks: [{ type: 'annotation', attrs: { commentId: firstId } }] }],
          }],
        },
      }),
    })
    expect(first.response.status).toBe(201)

    const second = await request<TestSong>(`/api/songs/${song.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        id: secondId,
        text: 'Яснее',
        quotedText: 'фраза',
        lyricsDocument: document,
      }),
    })
    expect(second.response.status).toBe(201)
    expect(second.body?.data?.lyricsComments).toHaveLength(2)

    const edited = await request<TestSong>(
      `/api/songs/${song.id}/comments/${firstId}`,
      { method: 'PUT', body: JSON.stringify({ text: 'Ещё мягче' }) },
    )
    expect(edited.response.status).toBe(200)
    expect(edited.body?.data?.lyricsComments[0]).toMatchObject({
      id: firstId,
      text: 'Ещё мягче',
      isOrphaned: false,
    })
  })

  it('удаляет комментарий и его метку, не удаляя выбранный текст', async () => {
    const song = await createSong('Удаление комментария')
    const commentId = '3f4ec587-071b-4d61-ad3a-959890817c78'
    const annotatedDocument: TestLyricsDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Текст остаётся',
          marks: [{ type: 'annotation', attrs: { commentId } }],
        }],
      }],
    }
    await request<TestSong>(`/api/songs/${song.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        id: commentId,
        text: 'Временный комментарий',
        quotedText: 'Текст остаётся',
        lyricsDocument: annotatedDocument,
      }),
    })

    const documentWithoutAnnotation: TestLyricsDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Текст остаётся' }],
      }],
    }
    const deleted = await request<TestSong>(
      `/api/songs/${song.id}/comments/${commentId}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ lyricsDocument: documentWithoutAnnotation }),
      },
    )

    expect(deleted.response.status).toBe(200)
    expect(deleted.body?.data?.lyricsComments).toEqual([])
    expect(deleted.body?.data?.lyricsDocument).toEqual(documentWithoutAnnotation)
  })

  it('сохраняет привязку после посторонней правки и помечает удалённый фрагмент', async () => {
    const song = await createSong('Стабильная привязка')
    const commentId = 'bc0c458d-6627-45b9-8bda-f036ea878957'
    const annotatedText = {
      type: 'text' as const,
      text: 'главная строка',
      marks: [{ type: 'annotation', attrs: { commentId } }],
    }
    const initialDocument: TestLyricsDocument = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [annotatedText] }],
    }
    await request<TestSong>(`/api/songs/${song.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        id: commentId,
        text: 'Сохраняем опору',
        quotedText: 'главная строка',
        lyricsDocument: initialDocument,
      }),
    })

    const unrelatedEdit: TestLyricsDocument = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Новый вступительный текст' }] },
        { type: 'paragraph', content: [annotatedText] },
      ],
    }
    const preserved = await request<TestSong>(`/api/songs/${song.id}/lyrics`, {
      method: 'PUT',
      body: JSON.stringify({ lyricsDocument: unrelatedEdit }),
    })
    expect(preserved.body?.data?.lyricsComments[0].isOrphaned).toBe(false)

    const deleted = await request<TestSong>(`/api/songs/${song.id}/lyrics`, {
      method: 'PUT',
      body: JSON.stringify({
        lyricsDocument: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Другой текст' }] }],
        },
      }),
    })
    expect(deleted.response.status).toBe(200)
    expect(deleted.body?.data?.lyricsComments[0]).toMatchObject({
      id: commentId,
      isOrphaned: true,
    })
  })
})
