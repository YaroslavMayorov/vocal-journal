import { describe, expect, it } from 'vitest'
import type { Exercise } from '../../domain/models'
import { filterAndSortExercises } from './filterExercises'

function exercise(
  id: string,
  title: string,
  tags: Array<{ id: string; name: string }>,
): Exercise {
  return {
    id,
    title,
    notes: '',
    plusMediaId: null,
    minusMediaId: null,
    tags,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const exercises = [
  exercise('1', 'Эхо', [{ id: 'breath', name: 'Дыхание' }]),
  exercise('2', 'Арпеджио', [
    { id: 'breath', name: 'Дыхание' },
    { id: 'range', name: 'Диапазон' },
  ]),
  exercise('3', 'Гамма', [{ id: 'range', name: 'Диапазон' }]),
]

describe('фильтрация упражнений', () => {
  it('сортирует названия по русскому алфавиту', () => {
    expect(
      filterAndSortExercises(exercises, { query: '', tagIds: [] }).map(
        (item) => item.title,
      ),
    ).toEqual(['Арпеджио', 'Гамма', 'Эхо'])
  })

  it('ищет по названию без учёта регистра', () => {
    expect(
      filterAndSortExercises(exercises, { query: 'ГАМ', tagIds: [] }).map(
        (item) => item.title,
      ),
    ).toEqual(['Гамма'])
  })

  it('использует AND для нескольких тегов', () => {
    expect(
      filterAndSortExercises(exercises, {
        query: '',
        tagIds: ['breath', 'range'],
      }).map((item) => item.title),
    ).toEqual(['Арпеджио'])
  })

  it('объединяет поиск с фильтрацией по тегам', () => {
    expect(
      filterAndSortExercises(exercises, {
        query: 'э',
        tagIds: ['range'],
      }),
    ).toEqual([])
  })
})
