import { useMemo, useState } from 'react'
import { FolderIcon, PlusIcon, SlidersIcon } from '../components/icons/Icons'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { TextInput } from '../components/ui/TextInput'
import { exercises } from '../data/localData'

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const filteredExercises = useMemo(
    () =>
      exercises.filter((exercise) =>
        exercise.title.toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru')),
      ),
    [query],
  )

  return (
    <div className="space-y-7">
      <PageHeader
        title="Упражнения"
        description="Вокальные упражнения, распевки и материалы для регулярной практики."
        actions={
          <Button disabled title="Будет доступно в следующей задаче">
            <PlusIcon className="size-4" />
            Добавить упражнение
          </Button>
        }
      />

      <section aria-label="Поиск и фильтры" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <TextInput
          label="Поиск упражнений"
          type="search"
          placeholder="Введите название"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Теги
          </span>
          <Button
            variant="secondary"
            disabled
            title="Фильтры появятся после добавления тегов"
            className="w-full sm:w-auto"
          >
            <SlidersIcon className="size-4" />
            Фильтр по тегам
          </Button>
        </div>
      </section>

      {filteredExercises.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="size-5" />}
          title={query ? 'Ничего не найдено' : 'Упражнений пока нет'}
          description={
            query
              ? 'Попробуйте изменить поисковый запрос.'
              : 'В следующей задаче здесь можно будет создать первое упражнение и добавить к нему теги.'
          }
        />
      ) : null}
    </div>
  )
}
