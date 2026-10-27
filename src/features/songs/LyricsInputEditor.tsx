import { EditorContent, useEditor } from '@tiptap/react'
import type { LyricsDocument } from '../../domain/models'
import { HIGHLIGHT_COLORS, lyricsEditorExtensions } from './editorConfig'

interface LyricsInputEditorProps {
  content: LyricsDocument
  onChange: (document: LyricsDocument) => void
  label?: string
}

export function LyricsInputEditor({
  content,
  label = 'Текст песни',
  onChange,
}: LyricsInputEditorProps) {
  const editor = useEditor({
    extensions: lyricsEditorExtensions,
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'lyrics-editor-content',
        'aria-label': label,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON() as LyricsDocument)
    },
  })

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-lg border bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
      <div
        role="toolbar"
        aria-label="Форматирование текста"
        className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2"
      >
        <button
          type="button"
          aria-label="Полужирный"
          aria-pressed={editor.isActive('bold')}
          className={`grid size-9 place-items-center rounded-md text-sm font-bold ${
            editor.isActive('bold')
              ? 'bg-brand-100 text-brand-700'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Ж
        </button>
        <button
          type="button"
          aria-label="Курсив"
          aria-pressed={editor.isActive('italic')}
          className={`grid size-9 place-items-center rounded-md text-sm italic ${
            editor.isActive('italic')
              ? 'bg-brand-100 text-brand-700'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          К
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            aria-label={`Выделение: ${color.label}`}
            aria-pressed={editor.isActive('highlight', { color: color.value })}
            className="grid size-9 place-items-center rounded-md hover:bg-slate-200"
            onClick={() =>
              editor.chain().focus().toggleHighlight({ color: color.value }).run()
            }
          >
            <span
              className="size-4 rounded-sm border border-black/10"
              style={{ backgroundColor: color.value }}
            />
          </button>
        ))}
        <button
          type="button"
          className="ml-1 min-h-9 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-200"
          onClick={() => editor.chain().focus().unsetHighlight().run()}
        >
          Без выделения
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
