import type { SongSummary } from '../../domain/models'

export function sortSongsChronologically(songs: SongSummary[]): SongSummary[] {
  return [...songs].sort((left, right) => {
    const byDate = left.createdAt.localeCompare(right.createdAt)
    return byDate !== 0 ? byDate : left.id.localeCompare(right.id)
  })
}
