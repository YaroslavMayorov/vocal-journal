import type {
  MediaAccess,
  StorageProvider,
  StoredObjectMetadata,
  UploadAuthorization,
  UploadVerification,
} from './types'
import { StorageProviderError } from './types'

const encoder = new TextEncoder()

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return bytesToHex(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  )
}

export async function createLocalSignedUrl({
  baseUrl,
  disposition = '',
  expiresAt,
  filename = '',
  method,
  secret,
  storageKey,
}: {
  baseUrl: string
  disposition?: 'inline' | 'attachment' | ''
  expiresAt: number
  filename?: string
  method: 'PUT' | 'GET' | 'HEAD'
  secret: string
  storageKey: string
}): Promise<string> {
  const payload = [method, storageKey, expiresAt, disposition, filename].join('\n')
  const signature = await signPayload(secret, payload)
  const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/')
  const url = new URL(`/objects/${encodedKey}`, baseUrl)
  url.searchParams.set('expires', String(expiresAt))
  if (disposition) url.searchParams.set('disposition', disposition)
  if (filename) url.searchParams.set('filename', filename)
  url.searchParams.set('signature', signature)
  return url.toString()
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const

  constructor(
    private readonly baseUrl: string,
    private readonly signingSecret: string,
  ) {}

  async authorizeUpload(
    storageKey: string,
    contentType: string,
  ): Promise<UploadAuthorization> {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 15 * 60
    return {
      uploadUrl: await createLocalSignedUrl({
        baseUrl: this.baseUrl,
        expiresAt: expiresAtSeconds,
        method: 'PUT',
        secret: this.signingSecret,
        storageKey,
      }),
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    }
  }

  async inspect(
    storageKey: string,
    verification?: UploadVerification,
  ): Promise<StoredObjectMetadata> {
    const { contentType, receipt, sizeBytes } = verification ?? {}
    if (
      !receipt ||
      !contentType ||
      !Number.isSafeInteger(sizeBytes) ||
      Number(sizeBytes) <= 0
    ) {
      throw new StorageProviderError('UPLOAD_RECEIPT_REQUIRED')
    }
    const expected = await signPayload(
      this.signingSecret,
      ['receipt', storageKey, sizeBytes, contentType].join('\n'),
    )
    if (receipt !== expected) {
      throw new StorageProviderError('INVALID_UPLOAD_RECEIPT')
    }
    return { contentType, sizeBytes: Number(sizeBytes) }
  }

  async createAccess(
    storageKey: string,
    originalFilename: string,
  ): Promise<MediaAccess> {
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + 60 * 60
    const common = {
      baseUrl: this.baseUrl,
      expiresAt: expiresAtSeconds,
      method: 'GET' as const,
      secret: this.signingSecret,
      storageKey,
    }
    return {
      playbackUrl: await createLocalSignedUrl({
        ...common,
        disposition: 'inline',
      }),
      downloadUrl: await createLocalSignedUrl({
        ...common,
        disposition: 'attachment',
        filename: originalFilename,
      }),
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    }
  }
}
