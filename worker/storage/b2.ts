import { AwsClient } from 'aws4fetch'
import type {
  MediaAccess,
  StorageProvider,
  StoredObjectMetadata,
  UploadAuthorization,
} from './types'
import { StorageObjectMissingError, StorageProviderError } from './types'

interface B2StorageConfig {
  endpoint: string
  region: string
  bucket: string
  keyId: string
  applicationKey: string
}

function encodeStorageKey(storageKey: string): string {
  return storageKey.split('/').map(encodeURIComponent).join('/')
}

function contentDisposition(filename: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export class B2StorageProvider implements StorageProvider {
  readonly name = 'b2' as const
  private readonly client: AwsClient

  constructor(
    private readonly config: B2StorageConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.client = new AwsClient({
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
      service: 's3',
      region: config.region,
      retries: 1,
    })
  }

  private objectUrl(storageKey: string): URL {
    const endpoint = this.config.endpoint.replace(/\/+$/, '')
    return new URL(
      `${endpoint}/${encodeURIComponent(this.config.bucket)}/${encodeStorageKey(storageKey)}`,
    )
  }

  private async signedUrl(
    storageKey: string,
    method: 'GET' | 'PUT',
    headers?: HeadersInit,
    query?: Record<string, string>,
  ): Promise<Request> {
    const url = this.objectUrl(storageKey)
    url.searchParams.set('X-Amz-Expires', '3600')
    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, value)
    }
    return this.client.sign(url, {
      method,
      headers,
      aws: { signQuery: true },
    })
  }

  async authorizeUpload(
    storageKey: string,
    contentType: string,
  ): Promise<UploadAuthorization> {
    const request = await this.signedUrl(storageKey, 'PUT', {
      'Content-Type': contentType,
    })
    return {
      uploadUrl: request.url,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
  }

  async inspect(storageKey: string): Promise<StoredObjectMetadata> {
    const request = await this.client.sign(this.objectUrl(storageKey), {
      method: 'HEAD',
    })
    let response: Response
    try {
      response = await this.fetchImpl(request)
    } catch {
      throw new StorageProviderError()
    }
    if (response.status === 404) throw new StorageObjectMissingError()
    if (!response.ok) throw new StorageProviderError()

    const sizeBytes = Number(response.headers.get('Content-Length'))
    const contentType = response.headers.get('Content-Type') ?? ''
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || !contentType) {
      throw new StorageProviderError('INVALID_STORAGE_METADATA')
    }
    return { contentType, sizeBytes }
  }

  async createAccess(
    storageKey: string,
    originalFilename: string,
  ): Promise<MediaAccess> {
    const [playback, download] = await Promise.all([
      this.signedUrl(storageKey, 'GET'),
      this.signedUrl(storageKey, 'GET', undefined, {
        'response-content-disposition': contentDisposition(originalFilename),
      }),
    ])
    return {
      playbackUrl: playback.url,
      downloadUrl: download.url,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
  }
}
