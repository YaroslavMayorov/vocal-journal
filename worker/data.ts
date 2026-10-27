import type { Exercise, Tag } from '../src/domain/models'
import type {
  ExerciseRow,
  ExerciseWithTagRow,
  TagRow,
  TagWithCountRow,
} from './types'
import { getActiveMediaForExercise } from './media-data'

export function mapTag(row: TagRow | TagWithCountRow): Tag {
  return {
    id: row.id,
    name: row.name,
    exerciseCount: 'exercise_count' in row ? Number(row.exercise_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapExerciseBase(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    plusMediaId: row.plus_media_id,
    minusMediaId: row.minus_media_id,
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapExerciseRows(rows: ExerciseWithTagRow[]): Exercise[] {
  const exercises = new Map<string, Exercise>()

  for (const row of rows) {
    let exercise = exercises.get(row.id)
    if (!exercise) {
      exercise = mapExerciseBase(row)
      exercises.set(row.id, exercise)
    }

    if (row.tag_id && row.tag_name) {
      exercise.tags.push({ id: row.tag_id, name: row.tag_name })
    }
  }

  return [...exercises.values()].sort((a, b) =>
    a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }),
  )
}

export async function getExercise(
  db: D1Database,
  id: string,
): Promise<Exercise | undefined> {
  const result = await db
    .prepare(
      `SELECT e.id, e.title, e.notes, e.plus_media_id, e.minus_media_id,
              e.created_at, e.updated_at, t.id AS tag_id, t.name AS tag_name
       FROM exercises e
       LEFT JOIN exercise_tags et ON et.exercise_id = e.id
       LEFT JOIN tags t ON t.id = et.tag_id
       WHERE e.id = ?
       ORDER BY t.name COLLATE NOCASE ASC`,
    )
    .bind(id)
    .all<ExerciseWithTagRow>()

  const exercise = mapExerciseRows(result.results)[0]
  if (!exercise) return undefined

  const [plusMedia, minusMedia] = await Promise.all([
    getActiveMediaForExercise(db, id, 'plus'),
    getActiveMediaForExercise(db, id, 'minus'),
  ])
  return { ...exercise, plusMedia, minusMedia }
}

export async function listExercises(db: D1Database): Promise<Exercise[]> {
  const result = await db
    .prepare(
      `SELECT e.id, e.title, e.notes, e.plus_media_id, e.minus_media_id,
              e.created_at, e.updated_at, t.id AS tag_id, t.name AS tag_name
       FROM exercises e
       LEFT JOIN exercise_tags et ON et.exercise_id = e.id
       LEFT JOIN tags t ON t.id = et.tag_id
       ORDER BY e.title COLLATE NOCASE ASC, t.name COLLATE NOCASE ASC`,
    )
    .all<ExerciseWithTagRow>()

  return mapExerciseRows(result.results)
}

export async function listTags(db: D1Database): Promise<Tag[]> {
  const result = await db
    .prepare(
      `SELECT t.id, t.name, t.created_at, t.updated_at,
              COUNT(et.exercise_id) AS exercise_count
       FROM tags t
       LEFT JOIN exercise_tags et ON et.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name COLLATE NOCASE ASC`,
    )
    .all<TagWithCountRow>()

  return result.results
    .map(mapTag)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }))
}

export async function validateTagIds(
  db: D1Database,
  tagIds: string[],
): Promise<boolean> {
  if (tagIds.length === 0) return true

  const placeholders = tagIds.map(() => '?').join(', ')
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM tags WHERE id IN (${placeholders})`)
    .bind(...tagIds)
    .first<{ count: number }>()

  return Number(row?.count ?? 0) === tagIds.length
}
