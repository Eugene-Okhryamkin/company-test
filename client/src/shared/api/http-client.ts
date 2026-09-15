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

export interface GetJsonOptions {
  signal?: AbortSignal
  /** Called with a successful (2xx) response before the body is read — e.g. to read headers. */
  onResponse?: (response: Response) => void
}

export interface PostJsonOptions {
  signal?: AbortSignal
}

async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  init: RequestInit,
  onResponse?: (response: Response) => void,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError('network', 'Network request failed', { cause: error })
  }

  if (!response.ok) {
    throw new ApiError('http', `Request failed with status ${response.status}`, { status: response.status })
  }

  onResponse?.(response)

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

/**
 * GET a JSON resource and validate it against a schema.
 * Every failure becomes an ApiError, except aborts which are rethrown as-is.
 */
export function getJson<T>(url: string, schema: z.ZodType<T>, { signal, onResponse }: GetJsonOptions = {}): Promise<T> {
  return requestJson(url, schema, { signal, headers: { Accept: 'application/json' } }, onResponse)
}

/** POST a JSON body and validate the JSON answer; same error contract as getJson. */
export function postJson<T>(url: string, body: unknown, schema: z.ZodType<T>, { signal }: PostJsonOptions = {}): Promise<T> {
  return requestJson(url, schema, {
    method: 'POST',
    signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
