import { z } from 'zod'
import { getCanonicalYouTubeUrl } from '../src/lib/youtube'
import { lyricsDocumentSchema } from './lyrics'

const trimmedRequired = (label: string, max: number) =>
  z
    .string({ error: `${label} обязательно` })
    .trim()
    .min(1, `${label} обязательно`)
    .max(max, `${label} слишком длинное`)

export const uuidSchema = z.uuid({ error: 'Некорректный идентификатор' })

export const tagInputSchema = z.object({
  name: trimmedRequired('Название тега', 80),
})

export const exerciseInputSchema = z.object({
  title: trimmedRequired('Название', 200),
  notes: z
    .string({ error: 'Комментарий должен быть текстом' })
    .trim()
    .max(20_000, 'Комментарий слишком длинный')
    .default(''),
  tagIds: z
    .array(uuidSchema, { error: 'Теги должны быть списком' })
    .max(100, 'Выбрано слишком много тегов')
    .transform((ids) => [...new Set(ids)])
    .default([]),
})

export type ExerciseInput = z.infer<typeof exerciseInputSchema>

export const songStatusSchema = z.enum(['learning', 'learned', 'postponed'])

const youtubeUrlSchema = z
  .string({ error: 'Ссылка на YouTube должна быть текстом' })
  .trim()
  .max(2_048, 'Ссылка на YouTube слишком длинная')
  .refine(
    (value) => value === '' || getCanonicalYouTubeUrl(value) !== null,
    'Введите корректную ссылку на YouTube',
  )
  .transform((value) => (value ? getCanonicalYouTubeUrl(value) : null))

export const songMetadataSchema = z.object({
  title: trimmedRequired('Название', 200),
  artist: z
    .string({ error: 'Исполнитель должен быть текстом' })
    .trim()
    .max(200, 'Имя исполнителя слишком длинное')
    .default(''),
  status: songStatusSchema.default('learning'),
  youtubeUrl: youtubeUrlSchema.default(''),
})

export const songCreateSchema = songMetadataSchema.extend({
  lyricsDocument: lyricsDocumentSchema.default({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }),
})

export const lyricsUpdateSchema = z.object({
  lyricsDocument: lyricsDocumentSchema,
})

export const lyricsCommentCreateSchema = z.object({
  id: uuidSchema,
  text: trimmedRequired('Комментарий', 5_000),
  quotedText: trimmedRequired('Выбранный фрагмент', 5_000),
  lyricsDocument: lyricsDocumentSchema,
})

export const lyricsCommentUpdateSchema = z.object({
  text: trimmedRequired('Комментарий', 5_000),
})
