import { FolderIcon, PlusIcon } from '../components/icons/Icons'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { songs } from '../data/localData'

export function SongsPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Песни"
        description="Репертуар, тексты, минусовки и записи работы над песнями."
        actions={
          <Button disabled title="Будет доступно в одной из следующих задач">
            <PlusIcon className="size-4" />
            Добавить песню
          </Button>
        }
      />

      {songs.length === 0 ? (
        <EmptyState
          icon={<FolderIcon className="size-5" />}
          title="Песен пока нет"
          description="Когда появится возможность добавлять песни, они будут расположены здесь по дате создания — от старых к новым."
        />
      ) : null}
    </div>
  )
}
