import type { Exercise } from '../../domain/models'

export interface ExerciseFilters {
  query: string
  tagIds: string[]
}

export function filterAndSortExercises(
  exercises: Exercise[],
  { query, tagIds }: ExerciseFilters,
): Exercise[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')

  return exercises
    .filter((exercise) => {
      const matchesSearch = exercise.title
        .toLocaleLowerCase('ru')
        .includes(normalizedQuery)
      const exerciseTagIds = new Set(exercise.tags.map((tag) => tag.id))
      const matchesTags = tagIds.every((tagId) => exerciseTagIds.has(tagId))
      return matchesSearch && matchesTags
    })
    .sort((a, b) =>
      a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
    )
}
