import type { Song } from '../domain/models'

// Task 1 intentionally starts with empty local collections. They will be
// replaced by Worker API queries in later tasks.
export const songs: Song[] = []

export function findSong(id: string): Song | undefined {
  return songs.find((song) => song.id === id)
}
