import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import type { SongCreateInput, SongMetadataInput } from '../../api/songs'
import { Button, LinkButton } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/TextInput'
import {
  EMPTY_LYRICS_DOCUMENT,
  SONG_STATUSES,
  SONG_STATUS_LABELS,
  type LyricsDocument,
  type SongStatus,
} from '../../domain/models'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { getYouTubeVideoId } from '../../lib/youtube'
import { LyricsInputEditor } from './LyricsInputEditor'

interface SongFormValue extends SongMetadataInput {
  lyricsDocument: LyricsDocument
}

interface SongFormProps {
  initialValue?: SongFormValue
  includeLyrics?: boolean
  submitLabel: string
  cancelTo: string
  onSubmit: (value: SongCreateInput | SongMetadataInput) => Promise<void>
}

const EMPTY_VALUE: SongFormValue = {
  title: '',
  artist: '',
  status: 'learning',
  youtubeUrl: '',
  lyricsDocument: EMPTY_LYRICS_DOCUMENT,
}

export function SongForm({
  cancelTo,
  includeLyrics = false,
  initialValue = EMPTY_VALUE,
  onSubmit,
  submitLabel,
}: SongFormProps) {
  const [title, setTitle] = useState(initialValue.title)
  const [artist, setArtist] = useState(initialValue.artist)
  const [status, setStatus] = useState<SongStatus>(initialValue.status)
  const [youtubeUrl, setYoutubeUrl] = useState(initialValue.youtubeUrl)
  const [lyricsDocument, setLyricsDocument] = useState(initialValue.lyricsDocument)
  const [errors, setErrors] = useState<{ title?: string; youtubeUrl?: string }>({})
  const [submissionError, setSubmissionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDirty =
    title !== initialValue.title ||
    artist !== initialValue.artist ||
    status !== initialValue.status ||
    youtubeUrl !== initialValue.youtubeUrl ||
    (includeLyrics &&
      JSON.stringify(lyricsDocument) !== JSON.stringify(initialValue.lyricsDocument))
  useUnsavedChanges(isDirty && !isSubmitting)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors: typeof errors = {}
    if (!title.trim()) nextErrors.title = 'Введите название песни'
    if (youtubeUrl.trim() && !getYouTubeVideoId(youtubeUrl)) {
      nextErrors.youtubeUrl = 'Введите корректную ссылку на YouTube'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmissionError('')
    setIsSubmitting(true)
    const metadata: SongMetadataInput = {
      title: title.trim(),
      artist: artist.trim(),
      status,
      youtubeUrl: youtubeUrl.trim(),
    }
    try {
      await onSubmit(
        includeLyrics ? { ...metadata, lyricsDocument } : metadata,
      )
    } catch (caught) {
      setSubmissionError(
        caught instanceof ApiError
          ? caught.message
          : 'Не удалось сохранить песню. Попробуйте ещё раз.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {submissionError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submissionError}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label="Название"
          value={title}
          error={errors.title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value)
            if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
          }}
        />
        <TextInput
          label="Исполнитель"
          value={artist}
          maxLength={200}
          placeholder="Необязательно"
          onChange={(event) => setArtist(event.target.value)}
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">Статус</span>
        <select
          className="h-11 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-900 shadow-xs focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none sm:max-w-xs"
          value={status}
          onChange={(event) => setStatus(event.target.value as SongStatus)}
        >
          {SONG_STATUSES.map((value) => (
            <option key={value} value={value}>
              {SONG_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <TextInput
        label="Ссылка на YouTube"
        value={youtubeUrl}
        error={errors.youtubeUrl}
        placeholder="https://www.youtube.com/watch?v=…"
        inputMode="url"
        onChange={(event) => {
          setYoutubeUrl(event.target.value)
          if (errors.youtubeUrl) {
            setErrors((current) => ({ ...current, youtubeUrl: undefined }))
          }
        }}
      />

      {includeLyrics ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Текст песни
          </legend>
          <LyricsInputEditor
            content={lyricsDocument}
            onChange={setLyricsDocument}
          />
        </fieldset>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <LinkButton to={cancelTo} variant="secondary">
          Отмена
        </LinkButton>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
