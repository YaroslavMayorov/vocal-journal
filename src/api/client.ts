const DEFAULT_API_BASE_URL = '/api'

export interface ApiErrorPayload {
  code: string
  message: string
  fieldErrors?: Record<string, string[] | undefined>
}

export interface ApiErrorBody {
  error?: ApiErrorPayload
}

interface ApiSuccessBody<T> {
  data: T
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors?: Record<string, string[] | undefined>

  constructor(status: number, message: string, body?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.code
    this.fieldErrors = body?.fieldErrors
  }
}

export interface ApiClientOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = trimTrailingSlash(
    options.baseUrl ?? import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  )
  const configuredFetch = options.fetchImpl

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await (configuredFetch ?? fetch)(`${baseUrl}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as
        | ApiErrorBody
        | undefined
      throw new ApiError(
        response.status,
        body?.error?.message ?? 'Не удалось выполнить запрос',
        body?.error,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    const body = (await response.json()) as ApiSuccessBody<T>
    return body.data
  }

  return { request }
}

export const apiClient = createApiClient()
