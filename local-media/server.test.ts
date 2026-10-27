// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createLocalMediaServer,
  isSafeStorageKey,
  resolveStoragePath,
  signLocalRequest,
} from './server'

const secret = 'test-signing-secret'
const storageKey = 'media/2026/10/3f4ec587-071b-4d61-ad3a-959890817c78.mp3'
let root: string | undefined
let server: Server | undefined

async function startServer() {
  server = createLocalMediaServer({ root, secret })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

async function stopServer() {
  if (!server?.listening) return
  await new Promise<void>((resolve, reject) =>
    server!.close((error) => (error ? reject(error) : resolve())),
  )
}

function signedUrl(
  baseUrl: string,
  method: 'PUT' | 'GET' | 'HEAD',
  disposition = '',
  filename = '',
) {
  const expires = String(Math.floor(Date.now() / 1000) + 60)
  const signature = signLocalRequest(
    secret,
    method,
    storageKey,
    expires,
    disposition,
    filename,
  )
  const url = new URL(`/objects/${storageKey}`, baseUrl)
  url.searchParams.set('expires', expires)
  if (disposition) url.searchParams.set('disposition', disposition)
  if (filename) url.searchParams.set('filename', filename)
  url.searchParams.set('signature', signature)
  return url
}

afterEach(async () => {
  await stopServer()
  if (root) await rm(root, { recursive: true, force: true })
  root = undefined
  server = undefined
})

describe('локальное медиахранилище', () => {
  it('отклоняет небезопасные storage keys', () => {
    expect(isSafeStorageKey(storageKey)).toBe(true)
    expect(isSafeStorageKey('../../secret.mp3')).toBe(false)
    expect(isSafeStorageKey('media/2026/10/not-a-uuid.mp3')).toBe(false)
    expect(() => resolveStoragePath('/tmp/vocal-media', '../../secret.mp3')).toThrow(
      'UNSAFE_STORAGE_KEY',
    )
  })

  it('потоково загружает, скачивает и сохраняет файл после перезапуска', async () => {
    root = await mkdtemp(join(tmpdir(), 'vocal-journal-media-'))
    let baseUrl = await startServer()
    const audio = new Uint8Array([73, 68, 51, 4, 0, 0])
    const uploaded = await fetch(signedUrl(baseUrl, 'PUT'), {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: audio,
    })
    expect(uploaded.status).toBe(201)
    expect(uploaded.headers.get('X-Media-Receipt')).toMatch(/^[a-f0-9]{64}$/)
    await stopServer()

    baseUrl = await startServer()
    const head = await fetch(signedUrl(baseUrl, 'HEAD'), { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.headers.get('Content-Length')).toBe(String(audio.byteLength))
    expect(head.headers.get('Content-Type')).toBe('audio/mpeg')

    const downloaded = await fetch(
      signedUrl(baseUrl, 'GET', 'attachment', 'оригинал.mp3'),
    )
    expect(downloaded.status).toBe(200)
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(audio)
    expect(downloaded.headers.get('Content-Disposition')).toContain('attachment')
    expect(
      new Uint8Array(await readFile(resolveStoragePath(root, storageKey))),
    ).toEqual(audio)
  })

  it('отклоняет неверную подпись и пустой файл', async () => {
    root = await mkdtemp(join(tmpdir(), 'vocal-journal-media-'))
    const baseUrl = await startServer()
    const invalid = signedUrl(baseUrl, 'PUT')
    invalid.searchParams.set('signature', '0'.repeat(64))
    expect(
      (await fetch(invalid, { method: 'PUT', body: new Uint8Array([1]) })).status,
    ).toBe(403)

    expect((await fetch(signedUrl(baseUrl, 'PUT'), {
      method: 'PUT',
      headers: { 'Content-Length': '0', 'Content-Type': 'audio/mpeg' },
    })).status).toBe(400)
  })
})
