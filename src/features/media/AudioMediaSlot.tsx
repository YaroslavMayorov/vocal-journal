import { useEffect, useId, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  mediaApi,
  uploadMediaFile,
  type MediaOwnerType,
  type MediaSlotName,
} from '../../api/media'
import { buttonClasses } from '../../components/ui/Button'
import type { MediaFile } from '../../domain/models'

const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024
const CONTENT_TYPES: Record<string, string[]> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
}

function readableSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  return `${Math.max(1, Math.round(bytes / 1024))} КБ`
}

function validateFile(file: File): { contentType?: string; error?: string } {
  if (file.size === 0) return { error: 'Пустой файл загружать нельзя' }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return { error: 'Файл не должен превышать 100 МБ' }
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const supportedTypes = CONTENT_TYPES[extension]
  if (!supportedTypes) return { error: 'Поддерживаются только MP3, M4A и WAV' }
  const contentType = file.type || supportedTypes[0]
  if (!supportedTypes.includes(contentType.toLowerCase())) {
    return { error: 'Расширение и тип аудиофайла не совпадают' }
  }
  return { contentType }
}

interface AudioMediaSlotProps {
  ownerType: MediaOwnerType
  ownerId: string
  slot: MediaSlotName
  media: MediaFile | null
  emptyLabel: string
  uploadLabel: string
  onMediaChange: (media: MediaFile) => void
}

export function AudioMediaSlot({
  emptyLabel,
  media,
  onMediaChange,
  ownerId,
  ownerType,
  slot,
  uploadLabel,
}: AudioMediaSlotProps) {
  const inputId = useId()
  const [access, setAccess] = useState<{
    mediaId: string
    playbackUrl: string
    downloadUrl: string
  } | null>(null)
  const [error, setError] = useState('')
  const [decodeError, setDecodeError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const mediaId = media?.id

  useEffect(() => {
    if (!mediaId) return
    let active = true
    mediaApi.getAccess(mediaId).then(
      (nextAccess) => {
        if (active) {
          setAccess({ mediaId, ...nextAccess })
          setError('')
        }
      },
      (caught: unknown) => {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Не удалось открыть аудиофайл.',
          )
        }
      },
    )
    return () => {
      active = false
    }
  }, [mediaId])

  const handleFile = async (file: File) => {
    if (isUploading) return
    const validation = validateFile(file)
    if (validation.error || !validation.contentType) {
      setError(validation.error ?? 'Некорректный файл')
      return
    }

    setError('')
    setDecodeError(false)
    setProgress(0)
    setIsUploading(true)
    try {
      const authorization = await mediaApi.authorizeUpload({
        ownerType,
        ownerId,
        slot,
        originalFilename: file.name,
        contentType: validation.contentType,
        sizeBytes: file.size,
      })
      const verification = await uploadMediaFile(authorization, file, setProgress)
      const uploadedMedia = await mediaApi.finalizeUpload(
        authorization.mediaId,
        verification,
      )
      onMediaChange(uploadedMedia)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Не удалось загрузить файл. Проверьте соединение и попробуйте снова.',
      )
    } finally {
      setIsUploading(false)
    }
  }

  const currentAccess = access?.mediaId === media?.id ? access : null

  return (
    <div className="space-y-4">
      {media ? (
        <div>
          <p className="break-words text-sm font-medium text-slate-800">
            {media.original.fileName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {readableSize(media.original.sizeBytes)} · оригинал без обработки
          </p>
          {currentAccess ? (
            <audio
              className="mt-4 w-full"
              controls
              preload="metadata"
              src={currentAccess.playbackUrl}
              onError={() => setDecodeError(true)}
            >
              Ваш браузер не поддерживает воспроизведение аудио.
            </audio>
          ) : !error ? (
            <p className="mt-3 text-sm text-slate-500">Подготовка плеера…</p>
          ) : null}
          {decodeError ? (
            <p className="mt-2 text-sm text-amber-700">
              Браузер не смог воспроизвести этот формат. Скачайте оригинальный файл.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {isUploading ? (
        <div aria-live="polite">
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Загрузка…</span>
            <span>{progress}%</span>
          </div>
          <progress className="h-2 w-full accent-brand-600" max={100} value={progress} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={`${buttonClasses(media ? 'secondary' : 'primary')} ${
            isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'
          }`}
        >
          {media ? 'Заменить файл' : uploadLabel}
        </label>
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/x-m4a"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleFile(file)
          }}
        />
        {currentAccess ? (
          <a
            className={buttonClasses('ghost')}
            href={currentAccess.downloadUrl}
            download={media?.original.fileName}
          >
            Скачать
          </a>
        ) : null}
      </div>
    </div>
  )
}
