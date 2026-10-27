import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { songsApi, type SongMetadataInput } from '../api/songs'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { SongForm } from '../features/songs/SongForm'
import { useApiResource } from '../hooks/useApiResource'

export function SongEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const loadSong = useCallback(() => songsApi.get(id), [id])
  const resource = useApiResource(loadSong)

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
  if (resource.status === 'error') return <ErrorState onRetry={resource.reload} />

  const song = resource.data
  return (
    <div className="space-y-7">
      <PageHeader title="Редактирование песни" />
      <SectionCard title="Информация о песне">
        <SongForm
          initialValue={{
            title: song.title,
            artist: song.artist,
            status: song.status,
            youtubeUrl: song.youtubeUrl ?? '',
            lyricsDocument: song.lyricsDocument,
          }}
          submitLabel="Сохранить изменения"
          cancelTo={`/songs/${id}`}
          onSubmit={async (value) => {
            await songsApi.update(id, value as SongMetadataInput)
            navigate(`/songs/${id}`, {
              replace: true,
              state: { message: 'Изменения сохранены' },
            })
          }}
        />
      </SectionCard>
    </div>
  )
}
