import type { Exercise, Tag } from '../domain/models'
import { apiClient } from './client'

export interface ExerciseInput {
  title: string
  notes: string
  tagIds: string[]
}

export const exercisesApi = {
  list: () => apiClient.request<Exercise[]>('/exercises'),
  get: (id: string) => apiClient.request<Exercise>(`/exercises/${id}`),
  create: (input: ExerciseInput) =>
    apiClient.request<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: ExerciseInput) =>
    apiClient.request<Exercise>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
}

export const tagsApi = {
  list: () => apiClient.request<Tag[]>('/tags'),
  create: (name: string) =>
    apiClient.request<Tag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id: string, name: string) =>
    apiClient.request<Tag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  delete: (id: string) =>
    apiClient.request<void>(`/tags/${id}`, { method: 'DELETE' }),
}
