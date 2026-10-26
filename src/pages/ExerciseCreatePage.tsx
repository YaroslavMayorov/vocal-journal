import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { exercisesApi, tagsApi } from '../api/exercises'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { ExerciseForm } from '../features/exercises/ExerciseForm'
import { useApiResource } from '../hooks/useApiResource'

export function ExerciseCreatePage() {
  const navigate = useNavigate()
  const loadTags = useCallback(() => tagsApi.list(), [])
  const tags = useApiResource(loadTags)

  return (
    <div className="space-y-7">
      <PageHeader
        title="Новое упражнение"
        description="Добавьте основную информацию. Аудио и попытки записи появятся в следующих задачах."
      />

      {tags.status === 'loading' ? <LoadingState /> : null}
      {tags.status === 'error' ? <ErrorState onRetry={tags.reload} /> : null}
      {tags.status === 'success' ? (
        <SectionCard title="Информация об упражнении">
          <ExerciseForm
            tags={tags.data}
            submitLabel="Создать упражнение"
            cancelTo="/exercises"
            onSubmit={async (value) => {
              const exercise = await exercisesApi.create(value)
              navigate(`/exercises/${exercise.id}`, {
                replace: true,
                state: { message: 'Упражнение создано' },
              })
            }}
          />
        </SectionCard>
      ) : null}
    </div>
  )
}
