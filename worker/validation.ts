import { z } from 'zod'

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
