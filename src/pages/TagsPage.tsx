import { PlusIcon, TagsIcon } from '../components/icons/Icons'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { tags } from '../data/localData'

export function TagsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Теги"
        description="Теги помогают объединять и быстро находить вокальные упражнения."
        actions={
          <Button disabled title="Будет доступно в следующей задаче">
            <PlusIcon className="size-4" />
            Добавить тег
          </Button>
        }
      />

      {tags.length === 0 ? (
        <EmptyState
          icon={<TagsIcon className="size-5" />}
          title="Тегов пока нет"
          description="Создание и редактирование тегов будет добавлено вместе с работой над упражнениями."
        />
      ) : null}
    </div>
  )
}
