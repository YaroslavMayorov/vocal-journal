import Highlight from '@tiptap/extension-highlight'
import StarterKit from '@tiptap/starter-kit'
import { AnnotationMark } from './AnnotationMark'

export const HIGHLIGHT_COLORS = [
  { value: '#fef08a', label: 'Жёлтый' },
  { value: '#bbf7d0', label: 'Зелёный' },
  { value: '#bfdbfe', label: 'Голубой' },
  { value: '#fecdd3', label: 'Розовый' },
] as const

export const lyricsEditorExtensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
  }),
  Highlight.configure({ multicolor: true }),
  AnnotationMark,
]
