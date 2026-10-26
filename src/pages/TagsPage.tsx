import { useCallback, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { tagsApi } from '../api/exercises'
import { PlusIcon, TagsIcon } from '../components/icons/Icons'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { ErrorState, LoadingState } from '../components/ui/StateMessage'
import { TextInput } from '../components/ui/TextInput'
import type { Tag } from '../domain/models'
import { useApiResource } from '../hooks/useApiResource'

function exerciseCountLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return `${count} упражнений`
  if (mod10 === 1) return `${count} упражнение`
  if (mod10 >= 2 && mod10 <= 4) return `${count} упражнения`
  return `${count} упражнений`
}

function mutationMessage(caught: unknown): string {
  return caught instanceof ApiError
    ? caught.message
    : 'Не удалось сохранить изменения. Попробуйте ещё раз.'
}

export function TagsPage() {
  const loadTags = useCallback(() => tagsApi.list(), [])
  const resource = useApiResource(loadTags)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [mutationError, setMutationError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const createTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isPending) return
    const name = newName.trim()
    if (!name) {
      setCreateError('Введите название тега')
      return
    }

    setCreateError('')
    setIsPending(true)
    try {
      await tagsApi.create(name)
      setNewName('')
      setIsCreating(false)
      resource.reload()
    } catch (caught) {
      setCreateError(mutationMessage(caught))
    } finally {
      setIsPending(false)
    }
  }

  const renameTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId || isPending) return
    const name = renameValue.trim()
    if (!name) {
      setRenameError('Введите название тега')
      return
    }

    setRenameError('')
    setIsPending(true)
    try {
      await tagsApi.update(editingId, name)
      setEditingId(null)
      resource.reload()
    } catch (caught) {
      setRenameError(mutationMessage(caught))
    } finally {
      setIsPending(false)
    }
  }

  const deleteTag = async () => {
    if (!tagToDelete || isPending) return
    setIsPending(true)
    setMutationError('')
    try {
      await tagsApi.delete(tagToDelete.id)
      setTagToDelete(null)
      resource.reload()
    } catch (caught) {
      setMutationError(mutationMessage(caught))
      setTagToDelete(null)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Теги"
        description="Теги помогают объединять и быстро находить вокальные упражнения."
        actions={
          <Button
            onClick={() => {
              setIsCreating(true)
              setCreateError('')
            }}
          >
            <PlusIcon className="size-4" />
            Добавить тег
          </Button>
        }
      />

      {mutationError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {mutationError}
        </div>
      ) : null}

      {isCreating ? (
        <form
          onSubmit={createTag}
          className="rounded-xl border bg-white p-4 sm:p-5"
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <TextInput
              label="Название нового тега"
              value={newName}
              error={createError}
              autoFocus
              maxLength={80}
              onChange={(event) => {
                setNewName(event.target.value)
                if (createError) setCreateError('')
              }}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Добавление…' : 'Добавить'}
              </Button>
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => {
                  setIsCreating(false)
                  setNewName('')
                  setCreateError('')
                }}
              >
                Отмена
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {resource.status === 'loading' ? <LoadingState /> : null}
      {resource.status === 'error' ? (
        <ErrorState onRetry={resource.reload} />
      ) : null}

      {resource.status === 'success' && resource.data.length === 0 ? (
        <EmptyState
          icon={<TagsIcon className="size-5" />}
          title="Тегов пока нет"
          description="Создайте первый тег, чтобы группировать и фильтровать упражнения."
        />
      ) : null}

      {resource.status === 'success' && resource.data.length > 0 ? (
        <div className="overflow-hidden rounded-xl border bg-white">
          <ul className="divide-y">
            {resource.data.map((tag) => (
              <li key={tag.id} className="px-4 py-3 sm:px-5">
                {editingId === tag.id ? (
                  <form
                    onSubmit={renameTag}
                    className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                    noValidate
                  >
                    <TextInput
                      label={`Новое название для «${tag.name}»`}
                      value={renameValue}
                      error={renameError}
                      autoFocus
                      maxLength={80}
                      onChange={(event) => {
                        setRenameValue(event.target.value)
                        if (renameError) setRenameError('')
                      }}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isPending}>
                        Сохранить
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={isPending}
                        onClick={() => setEditingId(null)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{tag.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {exerciseCountLabel(tag.exerciseCount ?? 0)}
                      </p>
                    </div>
                    <div className="flex gap-1 sm:shrink-0">
                      <Button
                        variant="ghost"
                        className="px-3"
                        onClick={() => {
                          setEditingId(tag.id)
                          setRenameValue(tag.name)
                          setRenameError('')
                        }}
                      >
                        Переименовать
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setTagToDelete(tag)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={tagToDelete !== null}
        title="Удалить тег?"
        description={`Тег «${tagToDelete?.name ?? ''}» исчезнет из всех упражнений. Сами упражнения сохранятся.`}
        confirmLabel="Удалить тег"
        isPending={isPending}
        onCancel={() => setTagToDelete(null)}
        onConfirm={deleteTag}
      />
    </div>
  )
}
