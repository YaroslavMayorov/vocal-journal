import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { songsApi } from '../api/songs'
import { FolderIcon, PlusIcon } from '../components/icons/Icons'
import { LinkButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { SongStatusBadge } from '../features/songs/SongStatusBadge'
import { sortSongsChronologically } from '../features/songs/sortSongs'
import { useApiResource } from '../hooks/useApiResource'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function SongsPage() {
  const loadSongs = useCallback(() => songsApi.list(), [])
  const resource = useApiResource(loadSongs)
  const songs = useMemo(
    () => sortSongsChronologically(resource.data ?? []),
    [resource.data],
  )

  return (
    <div className="space-y-7">
      <PageHeader
        title="Песни"
        description="Репертуар, тексты и материалы для работы над песнями."
        actions={
          <LinkButton to="/songs/new">
            <PlusIcon className="size-4" />
            Добавить песню
          </LinkButton>
        }
      />

      {resource.status === 'loading' ? <LoadingState /> : null}
      {resource.status === 'error' ? <ErrorState onRetry={resource.reload} /> : null}

      {resource.status === 'success' && songs.length === 0 ? (
        <div className="relative">
          <EmptyState
            icon={<FolderIcon className="size-5" />}
            title="Песен пока нет"
            description="Добавьте первую песню, чтобы хранить текст, видео исполнения и заметки."
          />
          <div className="absolute right-0 bottom-10 left-0 flex justify-center">
            <LinkButton to="/songs/new" variant="secondary">
              Создать песню
            </LinkButton>
          </div>
        </div>
      ) : null}

      {resource.status === 'success' && songs.length > 0 ? (
        <section aria-label="Список песен">
          <div className="overflow-hidden rounded-xl border bg-white">
            <ul className="divide-y">
              {songs.map((song) => (
                <li key={song.id}>
                  <Link
                    to={`/songs/${song.id}`}
                    className="flex min-h-16 flex-col gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900">
                        {song.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {song.artist || 'Исполнитель не указан'} ·{' '}
                        {dateFormatter.format(new Date(song.createdAt))}
                      </span>
                    </span>
                    <SongStatusBadge status={song.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  )
}
