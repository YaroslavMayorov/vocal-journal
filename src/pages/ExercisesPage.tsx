import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { exercisesApi, tagsApi } from '../api/exercises'
import { FolderIcon, PlusIcon } from '../components/icons/Icons'
import { Button, LinkButton } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { TagBadge } from '../components/ui/TagBadge'
import { TextInput } from '../components/ui/TextInput'
import { filterAndSortExercises } from '../features/exercises/filterExercises'
import { useApiResource } from '../hooks/useApiResource'
import type { Exercise, Tag } from '../domain/models'

const EMPTY_LIBRARY: [Exercise[], Tag[]] = [[], []]

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const loadLibrary = useCallback(
    () => Promise.all([exercisesApi.list(), tagsApi.list()]),
    [],
  )
  const resource = useApiResource(loadLibrary)

  const [exercises, tags] = resource.data ?? EMPTY_LIBRARY
  const filteredExercises = useMemo(
    () =>
      filterAndSortExercises(exercises, {
        query,
        tagIds: selectedTagIds,
      }),
    [exercises, query, selectedTagIds],
  )
  const hasFilters = query.trim().length > 0 || selectedTagIds.length > 0

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Упражнения"
        description="Вокальные упражнения, распевки и материалы для регулярной практики."
        actions={
          <LinkButton to="/exercises/new">
            <PlusIcon className="size-4" />
            Добавить упражнение
          </LinkButton>
        }
      />

      {resource.status === 'loading' ? <LoadingState /> : null}
      {resource.status === 'error' ? (
        <ErrorState onRetry={resource.reload} />
      ) : null}

      {resource.status === 'success' ? (
        <>
          <section aria-label="Поиск и фильтры" className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextInput
                  label="Поиск упражнений"
                  type="search"
                  placeholder="Введите название"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {query ? (
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Очистить
                </Button>
              ) : null}
            </div>

            {tags.length > 0 ? (
              <fieldset>
                <div className="flex items-center justify-between gap-4">
                  <legend className="text-sm font-medium text-slate-700">
                    Фильтр по тегам
                  </legend>
                  {selectedTagIds.length > 0 ? (
                    <Button
                      variant="ghost"
                      className="min-h-8 px-2 py-1 text-xs"
                      onClick={() => setSelectedTagIds([])}
                    >
                      Сбросить теги
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border bg-white p-2">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = selectedTagIds.includes(tag.id)
                      return (
                        <label
                          key={tag.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                            selected
                              ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-3.5 accent-brand-600"
                            checked={selected}
                            onChange={() => toggleTag(tag.id)}
                          />
                          {tag.name}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </fieldset>
            ) : null}
          </section>

          {exercises.length === 0 ? (
            <div className="relative">
              <EmptyState
                icon={<FolderIcon className="size-5" />}
                title="Упражнений пока нет"
                description="Создайте первое упражнение, добавьте комментарий преподавателя и подходящие теги."
              />
              <div className="absolute right-0 bottom-10 left-0 flex justify-center">
                <LinkButton to="/exercises/new" variant="secondary">
                  Создать упражнение
                </LinkButton>
              </div>
            </div>
          ) : filteredExercises.length === 0 ? (
            <EmptyState
              icon={<FolderIcon className="size-5" />}
              title="Ничего не найдено"
              description="Измените поисковый запрос или сбросьте выбранные теги."
            />
          ) : (
            <section aria-label="Список упражнений">
              <div className="overflow-hidden rounded-xl border bg-white">
                <ul className="divide-y">
                  {filteredExercises.map((exercise) => (
                    <li key={exercise.id}>
                      <Link
                        to={`/exercises/${exercise.id}`}
                        className="flex min-h-16 flex-col justify-center gap-2 px-4 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                      >
                        <span className="font-medium text-slate-900">
                          {exercise.title}
                        </span>
                        {exercise.tags.length > 0 ? (
                          <span className="flex flex-wrap gap-1.5 sm:justify-end">
                            {exercise.tags.map((tag) => (
                              <TagBadge key={tag.id} name={tag.name} />
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Без тегов</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {hasFilters
                  ? `Найдено: ${filteredExercises.length}`
                  : `Всего упражнений: ${exercises.length}`}
              </p>
            </section>
          )}
        </>
      ) : null}
    </div>
  )
}
