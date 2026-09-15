import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, getJson, postJson } from '@/shared/api/http-client'

const schema = z.array(z.object({ id: z.string() }))
const fetchMock = vi.fn<typeof fetch>()

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('expected promise to reject')
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

describe('getJson', () => {
  it('requests JSON with the given abort signal and returns validated data', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 'a' }]))
    const controller = new AbortController()

    await expect(getJson('/api/x', schema, { signal: controller.signal })).resolves.toEqual([{ id: 'a' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/x', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  })

  it('hands the successful response to onResponse (e.g. to read headers)', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 'a' }], { headers: { 'X-Data-Version': '9' } }))
    const onResponse = vi.fn()

    await getJson('/api/x', schema, { onResponse })

    expect(onResponse).toHaveBeenCalledTimes(1)
    expect(onResponse.mock.calls[0]![0].headers.get('X-Data-Version')).toBe('9')
  })

  it('throws an http ApiError for non-2xx responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Internal Server Error' }, { status: 500 }))

    const error = await captureError(getJson('/api/x', schema))
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 500 })
  })

  it('throws a network ApiError when the request cannot be made', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(getJson('/api/x', schema)).rejects.toMatchObject({ kind: 'network' })
  })

  it('throws a parse ApiError for a malformed body', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))

    await expect(getJson('/api/x', schema)).rejects.toMatchObject({ kind: 'parse' })
  })

  it('throws a validation ApiError when the body does not match the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1 }]))

    const error = await captureError(getJson('/api/x', schema))
    expect(error).toMatchObject({ kind: 'validation' })
    expect((error as ApiError).message).toMatch(/0\.id/)
  })

  it('rethrows an abort that happens while reading the body', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    const response = new Response('[]', { status: 200 })
    vi.spyOn(response, 'json').mockRejectedValue(abort)
    fetchMock.mockResolvedValue(response)

    await expect(getJson('/api/x', schema)).rejects.toBe(abort)
  })

  it('rethrows aborts untouched so callers can ignore them', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValue(abort)

    await expect(getJson('/api/x', schema)).rejects.toBe(abort)
  })
})

describe('postJson', () => {
  const answerSchema = z.object({ ok: z.boolean() })

  it('sends the body as JSON and returns validated data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))
    const controller = new AbortController()

    await expect(postJson('/api/y', { query: 'x' }, answerSchema, { signal: controller.signal })).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/y', {
      method: 'POST',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{"query":"x"}',
    })
  })

  it('shares error handling with getJson', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'AI search is not configured' }, { status: 503 }))
    await expect(postJson('/api/y', {}, answerSchema)).rejects.toMatchObject({ kind: 'http', status: 503 })

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(postJson('/api/y', {}, answerSchema)).rejects.toMatchObject({ kind: 'network' })

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: 'yes' }))
    await expect(postJson('/api/y', {}, answerSchema)).rejects.toMatchObject({ kind: 'validation' })
  })
})
