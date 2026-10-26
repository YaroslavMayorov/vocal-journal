import { useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { findSong } from '../data/localData'
import { SONG_STATUS_LABELS } from '../domain/models'

export function SongDetailPage() {
  const { id = '' } = useParams()
  const song = findSong(id)

  if (!song) {
    return (
      <ResourceNotFound
        title="Песня не найдена"
        description="Возможно, она ещё не добавлена или ссылка устарела."
        backTo="/songs"
        backLabel="Вернуться к песням"
      />
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={song.title}
        description={`Статус: ${SONG_STATUS_LABELS[song.status]}`}
      />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <SectionCard
            title="Исполнение на YouTube"
            description="Видео исполнения появится здесь после добавления ссылки."
          />
          <SectionCard
            title="Минусовка"
            description="Фонограмма песни появится здесь после загрузки файла."
          />
        </div>
        <SectionCard
          title="Текст песни"
          description={song.lyrics || 'Текст пока не добавлен.'}
          className="min-h-72"
        />
      </div>

      <SectionCard
        title="Попытки записи"
        description="Здесь будут собраны записи исполнения и комментарии с временными метками."
      />
    </div>
  )
}
