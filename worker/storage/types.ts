export interface UploadAuthorization {
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: string
}

export interface StoredObjectMetadata {
  contentType: string
  sizeBytes: number
}

export interface UploadVerification {
  receipt?: string
  sizeBytes?: number
  contentType?: string
}

export interface MediaAccess {
  playbackUrl: string
  downloadUrl: string
  expiresAt: string
}

export interface StorageProvider {
  readonly name: 'local' | 'b2'
  authorizeUpload(
    storageKey: string,
    contentType: string,
  ): Promise<UploadAuthorization>
  inspect(
    storageKey: string,
    verification?: UploadVerification,
  ): Promise<StoredObjectMetadata>
  createAccess(
    storageKey: string,
    originalFilename: string,
  ): Promise<MediaAccess>
}

export class StorageObjectMissingError extends Error {
  constructor() {
    super('STORAGE_OBJECT_MISSING')
    this.name = 'StorageObjectMissingError'
  }
}

export class StorageProviderError extends Error {
  constructor(message = 'STORAGE_PROVIDER_ERROR') {
    super(message)
    this.name = 'StorageProviderError'
  }
}
