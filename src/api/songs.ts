import type {
  LyricsDocument,
  Song,
  SongStatus,
  SongSummary,
} from '../domain/models'
import { apiClient } from './client'

export interface SongMetadataInput {
  title: string
  artist: string
  status: SongStatus
  youtubeUrl: string
}

export interface SongCreateInput extends SongMetadataInput {
  lyricsDocument: LyricsDocument
}

export interface LyricsCommentCreateInput {
  id: string
  text: string
  quotedText: string
  lyricsDocument: LyricsDocument
}

export const songsApi = {
  list: () => apiClient.request<SongSummary[]>('/songs'),
  get: (id: string) => apiClient.request<Song>(`/songs/${id}`),
  create: (input: SongCreateInput) =>
    apiClient.request<Song>('/songs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: SongMetadataInput) =>
    apiClient.request<Song>(`/songs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  updateLyrics: (id: string, lyricsDocument: LyricsDocument) =>
    apiClient.request<Song>(`/songs/${id}/lyrics`, {
      method: 'PUT',
      body: JSON.stringify({ lyricsDocument }),
    }),
  createComment: (songId: string, input: LyricsCommentCreateInput) =>
    apiClient.request<Song>(`/songs/${songId}/comments`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateComment: (songId: string, commentId: string, text: string) =>
    apiClient.request<Song>(`/songs/${songId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    }),
  deleteComment: (
    songId: string,
    commentId: string,
    lyricsDocument: LyricsDocument,
  ) =>
    apiClient.request<Song>(`/songs/${songId}/comments/${commentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ lyricsDocument }),
    }),
}
