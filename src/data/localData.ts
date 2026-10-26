import type { Exercise, Song, Tag } from '../domain/models'

// Task 1 intentionally starts with empty local collections. They will be
// replaced by Worker API queries in later tasks.
export const exercises: Exercise[] = []
export const songs: Song[] = []
export const tags: Tag[] = []

export function findExercise(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id)
}

export function findSong(id: string): Song | undefined {
  return songs.find((song) => song.id === id)
}
