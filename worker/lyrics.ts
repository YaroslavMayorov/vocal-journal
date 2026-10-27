import { z } from 'zod'
import type { LyricsDocument } from '../src/domain/models'

export const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecdd3'] as const

const boldMarkSchema = z.object({ type: z.literal('bold') }).strict()
const italicMarkSchema = z.object({ type: z.literal('italic') }).strict()
const highlightMarkSchema = z
  .object({
    type: z.literal('highlight'),
    attrs: z.object({ color: z.enum(HIGHLIGHT_COLORS) }).strict(),
  })
  .strict()
const annotationMarkSchema = z
  .object({
    type: z.literal('annotation'),
    attrs: z.object({ commentId: z.uuid() }).strict(),
  })
  .strict()

const markSchema = z.discriminatedUnion('type', [
  boldMarkSchema,
  italicMarkSchema,
  highlightMarkSchema,
  annotationMarkSchema,
])

const textNodeSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().min(1),
    marks: z.array(markSchema).max(8).optional(),
  })
  .strict()

const hardBreakNodeSchema = z.object({ type: z.literal('hardBreak') }).strict()

const paragraphSchema = z
  .object({
    type: z.literal('paragraph'),
    content: z.array(z.union([textNodeSchema, hardBreakNodeSchema])).optional(),
  })
  .strict()

export const lyricsDocumentSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(paragraphSchema).max(10_000),
  })
  .strict()
  .refine(
    (document) => JSON.stringify(document).length <= 500_000,
    'Текст песни слишком большой',
  )

export function getAnnotationIds(document: LyricsDocument): Set<string> {
  const ids = new Set<string>()
  for (const paragraph of document.content) {
    for (const node of paragraph.content ?? []) {
      if (node.type !== 'text') continue
      for (const mark of node.marks ?? []) {
        if (mark.type === 'annotation') ids.add(mark.attrs.commentId)
      }
    }
  }
  return ids
}
