import { describe, expect, it } from 'vitest'
import type { SongSummary } from '../../domain/models'
import { sortSongsChronologically } from './sortSongs'

const song = (id: string, createdAt: string): SongSummary => ({
  id,
  title: id,
  artist: '',
  status: 'learning',
  createdAt,
  updatedAt: createdAt,
})

describe('sortSongsChronologically', () => {
  it('сортирует от старых к новым и использует id при равных датах', () => {
    const input = [
      song('b', '2026-02-01T00:00:00.000Z'),
      song('c', '2026-01-01T00:00:00.000Z'),
      song('a', '2026-02-01T00:00:00.000Z'),
    ]
    expect(sortSongsChronologically(input).map((item) => item.id)).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(input.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })
})
