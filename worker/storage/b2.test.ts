// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { B2StorageProvider } from './b2'

const config = {
  endpoint: 'https://s3.us-west-004.backblazeb2.com',
  region: 'us-west-004',
  bucket: 'vocal-journal-private',
  keyId: 'bucket-scoped-key-id',
  applicationKey: 'bucket-scoped-secret',
}

describe('B2StorageProvider', () => {
  it('создаёт краткоживущие S3 URL без раскрытия секрета', async () => {
    const provider = new B2StorageProvider(config)
    const upload = await provider.authorizeUpload(
      'media/2026/10/file.mp3',
      'audio/mpeg',
    )
    const access = await provider.createAccess(
      'media/2026/10/file.mp3',
      'урок.mp3',
    )

    expect(upload.uploadUrl).toContain('X-Amz-Signature=')
    expect(upload.uploadUrl).not.toContain(config.applicationKey)
    expect(upload.headers).toEqual({ 'Content-Type': 'audio/mpeg' })
    expect(access.playbackUrl).toContain(config.bucket)
    expect(access.downloadUrl).toContain('response-content-disposition')
    expect(access.downloadUrl).not.toContain(config.applicationKey)
  })

  it('проверяет объект через подписанный HEAD, не выполняя реальный B2-запрос', async () => {
    const fetchMock = vi.fn(async (request: RequestInfo | URL) => {
      const signedRequest = request as Request
      expect(signedRequest.method).toBe('HEAD')
      expect(signedRequest.headers.get('Authorization')).toContain(
        'AWS4-HMAC-SHA256',
      )
      return new Response(null, {
        status: 200,
        headers: { 'Content-Length': '42', 'Content-Type': 'audio/wav' },
      })
    })
    const provider = new B2StorageProvider(
      config,
      fetchMock as unknown as typeof fetch,
    )

    await expect(provider.inspect('media/2026/10/file.wav')).resolves.toEqual({
      sizeBytes: 42,
      contentType: 'audio/wav',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
