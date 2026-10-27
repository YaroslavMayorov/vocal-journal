import { useNavigate } from 'react-router-dom'
import { songsApi, type SongCreateInput } from '../api/songs'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { SongForm } from '../features/songs/SongForm'

export function SongCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-7">
      <PageHeader
        title="Новая песня"
        description="Название — единственное обязательное поле. Остальные материалы можно добавить позже."
      />
      <SectionCard title="Информация о песне">
        <SongForm
          includeLyrics
          submitLabel="Создать песню"
          cancelTo="/songs"
          onSubmit={async (value) => {
            const song = await songsApi.create(value as SongCreateInput)
            navigate(`/songs/${song.id}`, {
              replace: true,
              state: { message: 'Песня создана' },
            })
          }}
        />
      </SectionCard>
    </div>
  )
}
