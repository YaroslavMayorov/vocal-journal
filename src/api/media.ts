import type { MediaFile } from '../domain/models'
import { apiClient } from './client'

export type MediaOwnerType = 'exercise' | 'song'
export type MediaSlotName = 'plus' | 'minus' | 'backing'

export interface MediaUploadInput {
  ownerType: MediaOwnerType
  ownerId: string
  slot: MediaSlotName
  originalFilename: string
  contentType: string
  sizeBytes: number
}

export interface MediaUploadAuthorization {
  mediaId: string
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: string
}

export interface MediaAccess {
  playbackUrl: string
  downloadUrl: string
  expiresAt: string
}

export interface UploadVerification {
  receipt?: string
  sizeBytes?: number
  contentType?: string
}

export function uploadMediaFile(
  authorization: MediaUploadAuthorization,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadVerification> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', authorization.uploadUrl)
    for (const [name, value] of Object.entries(authorization.headers)) {
      request.setRequestHeader(name, value)
    }
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        const receipt = request.getResponseHeader('X-Media-Receipt') ?? undefined
        const rawSize = request.getResponseHeader('X-Media-Size')
        const contentType = request.getResponseHeader('X-Media-Type') ?? undefined
        resolve({
          receipt,
          sizeBytes: rawSize ? Number(rawSize) : undefined,
          contentType,
        })
      } else {
        reject(new Error('UPLOAD_FAILED'))
      }
    })
    request.addEventListener('error', () => reject(new Error('NETWORK_ERROR')))
    request.addEventListener('abort', () => reject(new Error('UPLOAD_ABORTED')))
    request.send(file)
  })
}

export const mediaApi = {
  authorizeUpload: (input: MediaUploadInput) =>
    apiClient.request<MediaUploadAuthorization>('/media/uploads', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  finalizeUpload: (mediaId: string, verification: UploadVerification) =>
    apiClient.request<MediaFile>(`/media/uploads/${mediaId}/finalize`, {
      method: 'POST',
      body: JSON.stringify(verification),
    }),
  getAccess: (mediaId: string) =>
    apiClient.request<MediaAccess>(`/media/${mediaId}/access`),
}
