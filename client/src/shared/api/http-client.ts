import type { z } from 'zod'

export type ApiErrorKind = 'network' | 'http' | 'parse' | 'validation'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined

  constructor(kind: ApiErrorKind, message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

const formatIssues = (error: z.ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')

/**
 * GET a JSON resource and validate it against a schema.
 * Every failure becomes an ApiError, except aborts which are rethrown as-is.
 */
export async function getJson<T>(
  url: string,
  schema: z.ZodType<T>,
  { signal }: { signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('network', 'Network request failed', { cause: error })
  }

  if (!response.ok) {
    throw new ApiError('http', `Request failed with status ${response.status}`, { status: response.status })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('parse', 'Response is not valid JSON', { cause: error })
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError('validation', `Invalid API response: ${formatIssues(result.error)}`, {
      cause: result.error,
    })
  }
  return result.data
}
