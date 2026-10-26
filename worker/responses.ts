import type { ZodError } from 'zod'

export function json<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status })
}

export function error(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): Response {
  return Response.json(
    { error: { code, message, fieldErrors } },
    { status },
  )
}

export function validationError(validation: ZodError): Response {
  return error(
    422,
    'VALIDATION_ERROR',
    'Проверьте введённые данные',
    validation.flatten().fieldErrors,
  )
}
