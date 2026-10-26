import { useMemo, useState, type FormEvent } from 'react'
import type { Tag } from '../../domain/models'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import { ApiError } from '../../api/client'
import type { ExerciseInput } from '../../api/exercises'
import { Button, LinkButton } from '../../components/ui/Button'
import { TextArea } from '../../components/ui/TextArea'
import { TextInput } from '../../components/ui/TextInput'

interface ExerciseFormProps {
  tags: Tag[]
  initialValue?: ExerciseInput
  submitLabel: string
  cancelTo: string
  onSubmit: (value: ExerciseInput) => Promise<void>
}

const EMPTY_VALUE: ExerciseInput = { title: '', notes: '', tagIds: [] }

function sameTagIds(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index])
  )
}

export function ExerciseForm({
  cancelTo,
  initialValue = EMPTY_VALUE,
  onSubmit,
  submitLabel,
  tags,
}: ExerciseFormProps) {
  const [title, setTitle] = useState(initialValue.title)
  const [notes, setNotes] = useState(initialValue.notes)
  const [tagIds, setTagIds] = useState(initialValue.tagIds)
  const [titleError, setTitleError] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sortedTags = useMemo(
    () =>
      [...tags].sort((a, b) =>
        a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }),
      ),
    [tags],
  )
  const isDirty =
    title !== initialValue.title ||
    notes !== initialValue.notes ||
    !sameTagIds(tagIds, initialValue.tagIds)

  useUnsavedChanges(isDirty && !isSubmitting)

  const toggleTag = (tagId: string) => {
    setTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('Введите название упражнения')
      return
    }

    setTitleError('')
    setSubmissionError('')
    setIsSubmitting(true)
    try {
      await onSubmit({ title: trimmedTitle, notes: notes.trim(), tagIds })
    } catch (caught) {
      setSubmissionError(
        caught instanceof ApiError
          ? caught.message
          : 'Не удалось сохранить упражнение. Попробуйте ещё раз.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {submissionError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submissionError}
        </div>
      ) : null}

      <TextInput
        label="Название"
        value={title}
        error={titleError}
        autoComplete="off"
        maxLength={200}
        onChange={(event) => {
          setTitle(event.target.value)
          if (titleError) setTitleError('')
        }}
      />

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Теги</legend>
        {sortedTags.length > 0 ? (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-slate-50 p-2">
            <div className="flex flex-wrap gap-2">
              {sortedTags.map((tag) => {
                const selected = tagIds.includes(tag.id)
                return (
                  <label
                    key={tag.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-600"
                      checked={selected}
                      onChange={() => toggleTag(tag.id)}
                    />
                    {tag.name}
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Тегов пока нет. Их можно создать в разделе «Теги».
          </p>
        )}
      </fieldset>

      <TextArea
        label="Комментарий преподавателя"
        value={notes}
        maxLength={20_000}
        placeholder="Необязательные общие заметки"
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        <LinkButton to={cancelTo} variant="secondary">
          Отмена
        </LinkButton>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
