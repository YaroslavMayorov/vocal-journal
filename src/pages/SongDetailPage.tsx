import { useCallback, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { songsApi } from '../api/songs'
import { LinkButton } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import {
  SONG_STATUSES,
  SONG_STATUS_LABELS,
  type Song,
  type SongStatus,
} from '../domain/models'
import { LyricsWorkspace } from '../features/songs/LyricsWorkspace'
import { SongStatusBadge } from '../features/songs/SongStatusBadge'
import { useApiResource } from '../hooks/useApiResource'
import { getYouTubeEmbedUrl } from '../lib/youtube'

interface LocationState {
  message?: string
}

function SongDetailContent({
  initialSong,
  message,
}: {
  initialSong: Song
  message?: string
}) {
  const [song, setSong] = useState(initialSong)
  const [statusError, setStatusError] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const embedUrl = song.youtubeUrl ? getYouTubeEmbedUrl(song.youtubeUrl) : null

  const updateStatus = async (status: SongStatus) => {
    if (status === song.status || isUpdatingStatus) return
    setStatusError('')
    setIsUpdatingStatus(true)
    try {
      const updatedSong = await songsApi.update(song.id, {
        title: song.title,
        artist: song.artist,
        status,
        youtubeUrl: song.youtubeUrl ?? '',
      })
      setSong(updatedSong)
    } catch (caught) {
      setStatusError(
        caught instanceof ApiError
          ? caught.message
          : 'Не удалось изменить статус.',
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="space-y-7">
      {message ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      ) : null}

      <PageHeader
        title={song.title}
        description={song.artist || 'Исполнитель не указан'}
        actions={
          <LinkButton to={`/songs/${song.id}/edit`} variant="secondary">
            Редактировать песню
          </LinkButton>
        }
      />

      <section
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        aria-label="Статус песни"
      >
        <div>
          <p className="text-sm font-medium text-slate-700">Статус</p>
          <div className="mt-2">
            <SongStatusBadge status={song.status} />
          </div>
        </div>
        <label className="block sm:w-52">
          <span className="mb-2 block text-sm text-slate-600">
            Изменить статус
          </span>
          <select
            value={song.status}
            disabled={isUpdatingStatus}
            onChange={(event) => updateStatus(event.target.value as SongStatus)}
            className="h-10 w-full rounded-lg border bg-white px-3 text-sm shadow-xs focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-slate-100"
          >
            {SONG_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SONG_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </section>
      {statusError ? (
        <p role="alert" className="-mt-5 text-sm text-red-600">
          {statusError}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="space-y-5">
          <SectionCard title="Исполнение на YouTube">
            {embedUrl && song.youtubeUrl ? (
              <div>
                <div className="aspect-video overflow-hidden rounded-lg bg-slate-950">
                  <iframe
                    className="size-full"
                    src={embedUrl}
                    title={`YouTube: ${song.title}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-600"
                >
                  Открыть на YouTube
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Плюс не добавлен</p>
            )}
          </SectionCard>

          <SectionCard title="Минус" description="Минус не добавлен" />
        </div>

        <LyricsWorkspace song={song} onSongChange={setSong} />
      </div>

      <SectionCard
        title="Попытки записи"
        description="Записи исполнения и комментарии с временными метками появятся в следующей задаче."
      />
    </div>
  )
}

export function SongDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const loadSong = useCallback(() => songsApi.get(id), [id])
  const resource = useApiResource(loadSong)
  const message = (location.state as LocationState | null)?.message

  if (
    resource.status === 'error' &&
    resource.error instanceof ApiError &&
    [400, 404].includes(resource.error.status)
  ) {
    return (
      <ResourceNotFound
        title="Песня не найдена"
        description="Возможно, ссылка устарела."
        backTo="/songs"
        backLabel="Вернуться к песням"
      />
    )
  }

  if (resource.status === 'loading') return <LoadingState />
  if (resource.status === 'error') {
    return <ErrorState onRetry={resource.reload} />
  }

  return (
    <SongDetailContent
      key={resource.data.updatedAt}
      initialSong={resource.data}
      message={message}
    />
  )
}
