const DEFAULT_API_BASE_URL = '/api'

export interface ApiErrorBody {
  message?: string
  code?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly body?: ApiErrorBody

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
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
  const fetchImpl = options.fetchImpl ?? fetch

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetchImpl(`${baseUrl}/${path.replace(/^\//, '')}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init?.headers,
      },
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as
        | ApiErrorBody
        | undefined
      throw new ApiError(
        response.status,
        body?.message ?? 'Не удалось выполнить запрос',
        body,
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  return { request }
}

export const apiClient = createApiClient()
