import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { exercisesApi, tagsApi } from '../api/exercises'
import { PageHeader } from '../components/ui/PageHeader'
import { ResourceNotFound } from '../components/ui/ResourceNotFound'
import { SectionCard } from '../components/ui/SectionCard'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { ExerciseForm } from '../features/exercises/ExerciseForm'
import { useApiResource } from '../hooks/useApiResource'

export function ExerciseEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const loadData = useCallback(
    () => Promise.all([exercisesApi.get(id), tagsApi.list()]),
    [id],
  )
  const resource = useApiResource(loadData)

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

  return (
    <div className="space-y-7">
      <PageHeader title="Редактирование упражнения" />
      {resource.status === 'loading' ? <LoadingState /> : null}
      {resource.status === 'error' ? (
        <ErrorState onRetry={resource.reload} />
      ) : null}
      {resource.status === 'success' ? (
        <SectionCard title="Информация об упражнении">
          <ExerciseForm
            tags={resource.data[1]}
            initialValue={{
              title: resource.data[0].title,
              notes: resource.data[0].notes,
              tagIds: resource.data[0].tags.map((tag) => tag.id),
            }}
            submitLabel="Сохранить изменения"
            cancelTo={`/exercises/${id}`}
            onSubmit={async (value) => {
              await exercisesApi.update(id, value)
              navigate(`/exercises/${id}`, {
                replace: true,
                state: { message: 'Изменения сохранены' },
              })
            }}
          />
        </SectionCard>
      ) : null}
    </div>
  )
}
