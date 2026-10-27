import type { LyricsDocument, LyricsTextNode } from '../../domain/models'

export function removeAnnotation(
  document: LyricsDocument,
  commentId: string,
): LyricsDocument {
  return {
    ...document,
    content: document.content.map((paragraph) => ({
      ...paragraph,
      content: paragraph.content?.map((node) => {
        if (node.type !== 'text' || !node.marks) return node

        const marks = node.marks.filter(
          (mark) =>
            mark.type !== 'annotation' || mark.attrs.commentId !== commentId,
        )
        const textNode: LyricsTextNode = { ...node }
        if (marks.length > 0) textNode.marks = marks
        else delete textNode.marks
        return textNode
      }),
    })),
  }
}
