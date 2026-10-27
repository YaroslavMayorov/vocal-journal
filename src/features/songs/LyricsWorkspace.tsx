import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { songsApi } from '../../api/songs'
import { Button } from '../../components/ui/Button'
import type { LyricsComment, LyricsDocument, Song } from '../../domain/models'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { LyricsInputEditor } from './LyricsInputEditor'
import { removeAnnotation } from './annotations'
import { lyricsEditorExtensions } from './editorConfig'

interface LyricsWorkspaceProps {
  song: Song
  onSongChange: (song: Song) => void
}

interface SelectedText {
  from: number
  to: number
  text: string
  overlapsAnnotation: boolean
}

function CommentCard({ active, comment, onActivate, onDelete, onSave }: {
  active: boolean
  comment: LyricsComment
  onActivate: () => void
  onDelete: () => Promise<void>
  onSave: (text: string) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(comment.text)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || isSaving) return
    setError('')
    setIsSaving(true)
    try {
      await onSave(text.trim())
      setIsEditing(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Не удалось сохранить комментарий.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteComment = async () => {
    if (
      isDeleting ||
      !window.confirm(
        'Удалить комментарий? Выбранный фрагмент текста останется без изменений.',
      )
    ) {
      return
    }
    setError('')
    setIsDeleting(true)
    try {
      await onDelete()
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Не удалось удалить комментарий.',
      )
      setIsDeleting(false)
    }
  }

  return (
    <article
      className={`rounded-lg border p-3 transition-colors ${active ? 'border-amber-400 bg-amber-50' : 'bg-white'}`}
      onClick={onActivate}
    >
      <div className="flex items-start justify-between gap-3">
        <blockquote className="min-w-0 border-l-2 border-amber-300 pl-2 text-xs leading-5 text-slate-500">
          «{comment.quotedText}»
        </blockquote>
        {comment.isOrphaned ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Фрагмент удалён</span>
        ) : null}
      </div>
      {isEditing ? (
        <form className="mt-3 space-y-2" onSubmit={save} onClick={(event) => event.stopPropagation()}>
          <label className="block">
            <span className="sr-only">Текст комментария</span>
            <textarea autoFocus required maxLength={2000} rows={3} value={text} onChange={(event) => setText(event.target.value)} className="w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" className="min-h-8 px-3 py-1 text-xs" disabled={isSaving || !text.trim()}>{isSaving ? 'Сохранение…' : 'Сохранить'}</Button>
            <Button variant="ghost" className="min-h-8 px-3 py-1 text-xs" onClick={() => { setText(comment.text); setError(''); setIsEditing(false) }}>Отмена</Button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.text}</p>
          {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
          <div className="mt-2 flex flex-wrap gap-3">
            <button type="button" className="text-xs font-medium text-brand-700 hover:text-brand-600" onClick={(event) => { event.stopPropagation(); setIsEditing(true) }}>Редактировать</button>
            <button
              type="button"
              disabled={isDeleting}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:text-slate-400"
              onClick={(event) => {
                event.stopPropagation()
                void deleteComment()
              }}
            >
              {isDeleting ? 'Удаление…' : 'Удалить'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

export function LyricsWorkspace({ song, onSongChange }: LyricsWorkspaceProps) {
  const [selectedText, setSelectedText] = useState<SelectedText | null>(null)
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [isSavingComment, setIsSavingComment] = useState(false)
  const [isEditingLyrics, setIsEditingLyrics] = useState(false)
  const [draftLyrics, setDraftLyrics] = useState<LyricsDocument>(song.lyricsDocument)
  const [lyricsError, setLyricsError] = useState('')
  const [isSavingLyrics, setIsSavingLyrics] = useState(false)

  const editor = useEditor({
    extensions: lyricsEditorExtensions,
    content: song.lyricsDocument,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: 'lyrics-reader-content', 'aria-label': 'Текст песни' } },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection
      const text = currentEditor.state.doc.textBetween(from, to, '\n').trim()
      setSelectedText(text ? {
        from,
        to,
        text,
        overlapsAnnotation: currentEditor.state.doc.rangeHasMark(from, to, currentEditor.schema.marks.annotation),
      } : null)
    },
  })

  const activeComment = useMemo(() => song.lyricsComments.find((comment) => comment.id === activeCommentId), [activeCommentId, song.lyricsComments])
  const lyricsAreDirty = JSON.stringify(draftLyrics) !== JSON.stringify(song.lyricsDocument)
  useUnsavedChanges(isEditingLyrics && lyricsAreDirty && !isSavingLyrics)

  useEffect(() => {
    if (!editor || isEditingLyrics) return
    editor.commands.setContent(song.lyricsDocument)
  }, [editor, isEditingLyrics, song.lyricsDocument])

  useEffect(() => {
    document.querySelectorAll('.lyrics-annotation.is-selected').forEach((element) => element.classList.remove('is-selected'))
    if (!activeCommentId) return
    Array.from(document.querySelectorAll<HTMLElement>('[data-comment-id]'))
      .filter((element) => element.dataset.commentId === activeCommentId)
      .forEach((element) => element.classList.add('is-selected'))
  }, [activeCommentId, song.lyricsDocument])

  const activateComment = (comment: LyricsComment) => {
    setActiveCommentId(comment.id)
    setIsMobileCommentsOpen(true)
    if (comment.isOrphaned) return
    Array.from(document.querySelectorAll<HTMLElement>('[data-comment-id]'))
      .find((element) => element.dataset.commentId === comment.id)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const createComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor || !selectedText || !commentText.trim() || isSavingComment) return
    const commentId = crypto.randomUUID()
    const previousDocument = song.lyricsDocument
    editor.chain().setTextSelection({ from: selectedText.from, to: selectedText.to }).setMark('annotation', { commentId }).run()
    const lyricsDocument = editor.getJSON() as LyricsDocument
    setCommentError('')
    setIsSavingComment(true)
    try {
      const updatedSong = await songsApi.createComment(song.id, { id: commentId, text: commentText.trim(), quotedText: selectedText.text, lyricsDocument })
      onSongChange(updatedSong)
      setActiveCommentId(commentId)
      setSelectedText(null)
      setCommentText('')
      setIsAddingComment(false)
    } catch (caught) {
      editor.commands.setContent(previousDocument)
      editor.commands.setTextSelection({
        from: selectedText.from,
        to: selectedText.to,
      })
      setSelectedText(selectedText)
      setCommentError(caught instanceof ApiError ? caught.message : 'Не удалось добавить комментарий.')
    } finally {
      setIsSavingComment(false)
    }
  }

  const saveLyrics = async () => {
    if (isSavingLyrics) return
    setLyricsError('')
    setIsSavingLyrics(true)
    try {
      const updatedSong = await songsApi.updateLyrics(song.id, draftLyrics)
      onSongChange(updatedSong)
      setIsEditingLyrics(false)
      setSelectedText(null)
    } catch (caught) {
      setLyricsError(caught instanceof ApiError ? caught.message : 'Не удалось сохранить текст песни.')
    } finally {
      setIsSavingLyrics(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    const lyricsDocument = removeAnnotation(song.lyricsDocument, commentId)
    const updatedSong = await songsApi.deleteComment(
      song.id,
      commentId,
      lyricsDocument,
    )
    onSongChange(updatedSong)
    setActiveCommentId(null)
    setSelectedText(null)
    if (updatedSong.lyricsComments.length === 0) {
      setIsMobileCommentsOpen(false)
    }
  }

  const commentList = (
    <div className="space-y-3">
      {song.lyricsComments.length ? song.lyricsComments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          active={comment.id === activeCommentId}
          onActivate={() => activateComment(comment)}
          onDelete={() => deleteComment(comment.id)}
          onSave={async (text) => onSongChange(await songsApi.updateComment(song.id, comment.id, text))}
        />
      )) : (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-500">Выделите фрагмент текста, чтобы оставить первый комментарий.</p>
      )}
    </div>
  )

  return (
    <section className="rounded-xl border bg-white p-5 sm:p-6" aria-labelledby="lyrics-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="lyrics-heading" className="text-base font-semibold text-slate-900">Текст песни</h2>
          {!isEditingLyrics ? <p className="mt-1 text-xs leading-5 text-slate-500">Выделите слова в тексте, чтобы привязать комментарий.</p> : null}
        </div>
        {!isEditingLyrics ? <Button variant="secondary" className="self-start" onClick={() => { setDraftLyrics(song.lyricsDocument); setLyricsError(''); setIsEditingLyrics(true) }}>Редактировать текст</Button> : null}
      </div>

      {isEditingLyrics ? (
        <div className="mt-5">
          <LyricsInputEditor content={draftLyrics} onChange={setDraftLyrics} />
          {lyricsError ? <p role="alert" className="mt-3 text-sm text-red-600">{lyricsError}</p> : null}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => { if (lyricsAreDirty && !window.confirm('Отменить несохранённые изменения текста?')) return; setDraftLyrics(song.lyricsDocument); setIsEditingLyrics(false) }}>Отмена</Button>
            <Button onClick={saveLyrics} disabled={isSavingLyrics || !lyricsAreDirty}>{isSavingLyrics ? 'Сохранение…' : 'Сохранить текст'}</Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="min-h-72 rounded-lg border bg-slate-50/50 px-4 py-4 sm:px-5" onClick={(event) => {
              const target = event.target
              if (!(target instanceof Element)) return
              const annotation = target.closest<HTMLElement>('[data-comment-id]')
              const comment = song.lyricsComments.find((item) => item.id === annotation?.dataset.commentId)
              if (comment) activateComment(comment)
            }}>
              <EditorContent editor={editor} />
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button disabled={!selectedText || selectedText.overlapsAnnotation} onClick={() => { setCommentError(''); setIsAddingComment(true) }}>Добавить комментарий</Button>
              {selectedText?.overlapsAnnotation ? <p className="text-xs text-slate-500">Для одного фрагмента доступен один комментарий.</p> : !selectedText ? <p className="text-xs text-slate-500">Сначала выделите фрагмент текста.</p> : null}
            </div>
            {isAddingComment && selectedText ? (
              <form className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4" onSubmit={createComment}>
                <p className="text-xs leading-5 text-slate-500">Комментарий к «{selectedText.text}»</p>
                <label className="mt-3 block"><span className="sr-only">Новый комментарий</span><textarea autoFocus required maxLength={2000} rows={3} value={commentText} onChange={(event) => setCommentText(event.target.value)} className="w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" placeholder="Что важно учесть в этом месте?" /></label>
                {commentError ? <p role="alert" className="mt-2 text-sm text-red-600">{commentError}</p> : null}
                <div className="mt-3 flex gap-2"><Button type="submit" disabled={isSavingComment || !commentText.trim()}>{isSavingComment ? 'Сохранение…' : 'Добавить'}</Button><Button variant="ghost" onClick={() => { setCommentText(''); setCommentError(''); setIsAddingComment(false) }}>Отмена</Button></div>
              </form>
            ) : null}
          </div>
          <aside className="hidden xl:block" aria-label="Комментарии к тексту">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Комментарии</h3>
            <div className="max-h-[36rem] overflow-y-auto pr-1">{commentList}</div>
          </aside>
        </div>
      )}

      {!isEditingLyrics && song.lyricsComments.length ? (
        <div className="mt-6 xl:hidden">
          <Button
            variant="secondary"
            onClick={() => {
              setActiveCommentId(null)
              setIsMobileCommentsOpen(true)
            }}
          >
            Все комментарии ({song.lyricsComments.length})
          </Button>
        </div>
      ) : null}
      {!isEditingLyrics && isMobileCommentsOpen ? (
        <div className="fixed inset-x-3 bottom-3 z-30 rounded-xl border border-amber-300 bg-white p-4 shadow-xl sm:left-auto sm:right-5 sm:w-96 xl:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {activeComment ? 'Комментарий' : 'Комментарии'}
            </h3>
            <button
              type="button"
              aria-label="Закрыть комментарии"
              className="grid size-8 shrink-0 place-items-center rounded-md text-xl text-slate-500 hover:bg-slate-100"
              onClick={() => setIsMobileCommentsOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            {activeComment ? (
              <CommentCard
                comment={activeComment}
                active
                onActivate={() => undefined}
                onDelete={() => deleteComment(activeComment.id)}
                onSave={async (text) =>
                  onSongChange(
                    await songsApi.updateComment(song.id, activeComment.id, text),
                  )
                }
              />
            ) : commentList}
          </div>
        </div>
      ) : null}
    </section>
  )
}
