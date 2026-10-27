import { z } from 'zod'
import { uuidSchema } from './validation'

export const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024

const AUDIO_TYPES = {
  mp3: new Set(['audio/mpeg', 'audio/mp3']),
  m4a: new Set(['audio/mp4', 'audio/x-m4a', 'audio/m4a']),
  wav: new Set(['audio/wav', 'audio/x-wav', 'audio/wave']),
} as const

export const mediaUploadSchema = z
  .object({
    ownerType: z.enum(['exercise', 'song']),
    ownerId: uuidSchema,
    slot: z.enum(['plus', 'minus', 'backing']),
    originalFilename: z
      .string({ error: 'Имя файла обязательно' })
      .trim()
      .min(1, 'Имя файла обязательно')
      .max(255, 'Имя файла слишком длинное')
      .refine(
        (value) =>
          !/[/\\]/.test(value) &&
          [...value].every((character) => {
            const code = character.charCodeAt(0)
            return code >= 32 && code !== 127
          }),
        'Некорректное имя файла',
      ),
    contentType: z
      .string({ error: 'Тип файла обязателен' })
      .trim()
      .transform((value) => value.toLowerCase().split(';')[0]),
    sizeBytes: z
      .number({ error: 'Размер файла обязателен' })
      .int('Некорректный размер файла')
      .positive('Пустой файл загружать нельзя')
      .max(MAX_AUDIO_SIZE_BYTES, 'Файл не должен превышать 100 МБ'),
  })
  .superRefine((value, context) => {
    if (
      (value.ownerType === 'exercise' && value.slot === 'backing') ||
      (value.ownerType === 'song' && value.slot !== 'backing')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['slot'],
        message: 'Этот медиаслот не поддерживается',
      })
    }
    const extension = value.originalFilename.split('.').pop()?.toLowerCase()
    if (
      !extension ||
      !(extension in AUDIO_TYPES) ||
      !AUDIO_TYPES[extension as keyof typeof AUDIO_TYPES].has(value.contentType)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['originalFilename'],
        message: 'Поддерживаются только MP3, M4A и WAV',
      })
    }
  })

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>

export const uploadVerificationSchema = z.object({
  receipt: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  sizeBytes: z.number().int().positive().optional(),
  contentType: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase().split(';')[0])
    .optional(),
})

export function extensionFor(filename: string): 'mp3' | 'm4a' | 'wav' {
  return filename.split('.').pop()!.toLowerCase() as 'mp3' | 'm4a' | 'wav'
}
