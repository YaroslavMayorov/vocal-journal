import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { dirname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { pipeline } from 'node:stream/promises'

export const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024
const STORAGE_KEY_PATTERN =
  /^media\/\d{4}\/\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp3|m4a|wav)$/

interface StoredMetadata {
  contentType: string
  sizeBytes: number
}

export function isSafeStorageKey(storageKey: string): boolean {
  return STORAGE_KEY_PATTERN.test(storageKey)
}

export function resolveStoragePath(root: string, storageKey: string): string {
  if (!isSafeStorageKey(storageKey)) throw new Error('UNSAFE_STORAGE_KEY')
  const absoluteRoot = resolve(root)
  const target = resolve(absoluteRoot, ...storageKey.split('/'))
  if (!target.startsWith(`${absoluteRoot}${sep}`)) {
    throw new Error('UNSAFE_STORAGE_KEY')
  }
  return target
}

export function signLocalRequest(
  secret: string,
  method: string,
  storageKey: string,
  expires: string,
  disposition = '',
  filename = '',
): string {
  return createHmac('sha256', secret)
    .update([method, storageKey, expires, disposition, filename].join('\n'))
    .digest('hex')
}

export function signUploadReceipt(
  secret: string,
  storageKey: string,
  sizeBytes: number,
  contentType: string,
): string {
  return createHmac('sha256', secret)
    .update(['receipt', storageKey, sizeBytes, contentType].join('\n'))
    .digest('hex')
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, 'hex')
  const receivedBytes = Buffer.from(received, 'hex')
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  )
}

function setCors(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin ?? ''
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, PUT, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range')
  response.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, X-Media-Receipt, X-Media-Size, X-Media-Type',
  )
}

function sendText(response: ServerResponse, status: number, text: string) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  response.end(text)
}

function parseRange(value: string | undefined, size: number) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(value ?? '')
  if (!match) return null
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : size - 1
  if (start > end || end >= size) return null
  return { start, end }
}

export function createLocalMediaServer(options?: {
  root?: string
  secret?: string
}) {
  const root = options?.root ?? resolve(process.cwd(), '.local-media')
  const secret =
    options?.secret ??
    process.env.LOCAL_MEDIA_SIGNING_SECRET ??
    'vocal-journal-local-development-only'

  return createServer(async (request, response) => {
    setCors(request, response)
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    try {
      const url = new URL(request.url ?? '/', 'http://local-media.test')
      if (!url.pathname.startsWith('/objects/')) {
        sendText(response, 404, 'Файл не найден')
        return
      }
      const storageKey = decodeURIComponent(url.pathname.slice('/objects/'.length))
      const method = request.method ?? 'GET'
      const expires = url.searchParams.get('expires') ?? ''
      const disposition = url.searchParams.get('disposition') ?? ''
      const filename = url.searchParams.get('filename') ?? ''
      const receivedSignature = url.searchParams.get('signature') ?? ''
      const expectedSignature = signLocalRequest(
        secret,
        method,
        storageKey,
        expires,
        disposition,
        filename,
      )
      if (
        !/^\d+$/.test(expires) ||
        Number(expires) < Math.floor(Date.now() / 1000) ||
        !/^[a-f0-9]{64}$/.test(receivedSignature) ||
        !signaturesMatch(expectedSignature, receivedSignature)
      ) {
        sendText(response, 403, 'Ссылка недействительна или устарела')
        return
      }

      const filePath = resolveStoragePath(root, storageKey)
      const metadataPath = `${filePath}.json`

      if (method === 'PUT') {
        const contentLength = Number(request.headers['content-length'])
        if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
          sendText(response, 400, 'Пустой файл загружать нельзя')
          return
        }
        if (contentLength > MAX_AUDIO_SIZE_BYTES) {
          sendText(response, 413, 'Файл слишком большой')
          return
        }
        const contentType = request.headers['content-type'] ?? ''
        const temporaryPath = `${filePath}.${randomUUID()}.uploading`
        await mkdir(dirname(filePath), { recursive: true })
        try {
          await pipeline(request, createWriteStream(temporaryPath, { flags: 'wx' }))
          const uploaded = await stat(temporaryPath)
          if (uploaded.size !== contentLength) throw new Error('UPLOAD_INTERRUPTED')
          const metadata: StoredMetadata = {
            contentType: String(contentType),
            sizeBytes: uploaded.size,
          }
          await rename(temporaryPath, filePath)
          await writeFile(metadataPath, JSON.stringify(metadata), 'utf8')
        } catch (caught) {
          await unlink(temporaryPath).catch(() => undefined)
          throw caught
        }
        response.writeHead(201, {
          'X-Media-Receipt': signUploadReceipt(
            secret,
            storageKey,
            contentLength,
            String(contentType),
          ),
          'X-Media-Size': String(contentLength),
          'X-Media-Type': String(contentType),
        })
        response.end()
        return
      }

      if (method !== 'GET' && method !== 'HEAD') {
        sendText(response, 405, 'Метод не поддерживается')
        return
      }

      let fileStats
      let metadata: StoredMetadata
      try {
        fileStats = await stat(filePath)
        metadata = JSON.parse(await readFile(metadataPath, 'utf8')) as StoredMetadata
      } catch {
        sendText(response, 404, 'Файл не найден')
        return
      }

      const range = parseRange(request.headers.range, fileStats.size)
      const headers: Record<string, string | number> = {
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-store',
        'Content-Type': metadata.contentType,
      }
      if (disposition === 'attachment') {
        headers['Content-Disposition'] =
          `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      }
      if (range) {
        headers['Content-Length'] = range.end - range.start + 1
        headers['Content-Range'] = `bytes ${range.start}-${range.end}/${fileStats.size}`
        response.writeHead(206, headers)
      } else {
        headers['Content-Length'] = fileStats.size
        response.writeHead(200, headers)
      }
      if (method === 'HEAD') {
        response.end()
        return
      }
      const stream = createReadStream(filePath, range ?? undefined)
      await pipeline(stream, response)
    } catch {
      if (!response.headersSent) {
        sendText(response, 500, 'Не удалось обработать файл')
      } else {
        response.destroy()
      }
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.LOCAL_MEDIA_PORT ?? 8790)
  const root = resolve(process.cwd(), '.local-media')
  const server = createLocalMediaServer({ root })
  server.listen(port, '127.0.0.1', () => {
    console.log(`Локальное медиахранилище: ${root}`)
    console.log(`Media API: http://127.0.0.1:${port}`)
  })
}
