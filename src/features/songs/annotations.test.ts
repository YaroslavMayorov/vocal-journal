import { describe, expect, it } from 'vitest'
import type { LyricsDocument } from '../../domain/models'
import { removeAnnotation } from './annotations'

describe('removeAnnotation', () => {
  it('удаляет только метку комментария и сохраняет текст и форматирование', () => {
    const document: LyricsDocument = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Важная строка',
          marks: [
            { type: 'bold' },
            {
              type: 'annotation',
              attrs: { commentId: '2f5a48d9-2e31-47f0-87ed-11e67143b003' },
            },
          ],
        }],
      }],
    }

    expect(
      removeAnnotation(document, '2f5a48d9-2e31-47f0-87ed-11e67143b003'),
    ).toEqual({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Важная строка',
          marks: [{ type: 'bold' }],
        }],
      }],
    })
  })
})
