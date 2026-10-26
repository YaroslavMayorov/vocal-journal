import { useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { findExercise } from '../data/localData'

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const exercise = findExercise(id)

  if (!exercise) {
    return (
      <ResourceNotFound
        title="Упражнение не найдено"
        description="Возможно, оно ещё не создано или ссылка устарела."
        backTo="/exercises"
        backLabel="Вернуться к упражнениям"
      />
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title={exercise.title}
        description={
          exercise.tagIds.length > 0
            ? `Тегов: ${exercise.tagIds.length}`
            : 'Теги не добавлены'
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        <SectionCard
          title="Плюс"
          description="Оригинальная запись упражнения с голосом."
        />
        <SectionCard
          title="Минус"
          description="Фонограмма упражнения без ведущего голоса."
        />
      </div>

      <SectionCard
        title="Общие заметки преподавателя"
        description={exercise.teacherNotes || 'Заметок пока нет.'}
      />

      <SectionCard
        title="Попытки записи"
        description="Здесь будут собраны записи упражнения и комментарии к ним."
      />
    </div>
  )
}
