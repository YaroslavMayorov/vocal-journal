import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { exercisesApi } from '../api/exercises'
import { LinkButton } from '../components/ui/Button'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { TagBadge } from '../components/ui/TagBadge'
import { useApiResource } from '../hooks/useApiResource'

interface LocationState {
  message?: string
}

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const loadExercise = useCallback(() => exercisesApi.get(id), [id])
  const resource = useApiResource(loadExercise)
  const message = (location.state as LocationState | null)?.message

  if (
    resource.status === 'error' &&
    resource.error instanceof ApiError &&
    [400, 404].includes(resource.error.status)
  ) {
    return (
      <ResourceNotFound
        title="Упражнение не найдено"
        description="Возможно, оно было удалено или ссылка устарела."
        backTo="/exercises"
        backLabel="Вернуться к упражнениям"
      />
    )
  }

  if (resource.status === 'loading') return <LoadingState />
  if (resource.status === 'error') {
    return <ErrorState onRetry={resource.reload} />
  }

  const exercise = resource.data

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
        title={exercise.title}
        actions={
          <LinkButton to={`/exercises/${exercise.id}/edit`} variant="secondary">
            Редактировать
          </LinkButton>
        }
      />

      <section aria-labelledby="exercise-tags-title">
        <h2 id="exercise-tags-title" className="text-sm font-medium text-slate-700">
          Теги
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {exercise.tags.length > 0 ? (
            exercise.tags.map((tag) => <TagBadge key={tag.id} name={tag.name} />)
          ) : (
            <p className="text-sm text-slate-500">Теги не добавлены</p>
          )}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <SectionCard title="Плюс" description="Плюс не добавлен" />
        <SectionCard title="Минус" description="Минус не добавлен" />
      </div>

      <SectionCard title="Комментарий преподавателя">
        {exercise.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {exercise.notes}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Комментарий пока не добавлен.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Попытки записи"
        description="Записи исполнения и комментарии к ним будут доступны в одной из следующих задач."
      />
    </div>
  )
}
