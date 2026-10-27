import { Mark, mergeAttributes } from '@tiptap/core'

export const AnnotationMark = Mark.create({
  name: 'annotation',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) =>
          attributes.commentId
            ? { 'data-comment-id': String(attributes.commentId) }
            : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'lyrics-annotation' }),
      0,
    ]
  },
})
