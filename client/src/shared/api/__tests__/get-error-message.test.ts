import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '@/shared/api/get-error-message'
import { ApiError } from '@/shared/api/http-client'

describe('getErrorMessage', () => {
  it.each([
    [new ApiError('network', 'x'), 'Нет соединения с сервером. Проверьте подключение.'],
    [new ApiError('http', 'x', { status: 503 }), 'Сервер вернул ошибку (503).'],
    [new ApiError('parse', 'x'), 'Сервер вернул данные в неожиданном формате.'],
    [new ApiError('validation', 'x'), 'Сервер вернул данные в неожиданном формате.'],
    [new Error('x'), 'Не удалось загрузить данные.'],
    ['weird', 'Не удалось загрузить данные.'],
  ])('%o → %s', (error, message) => {
    expect(getErrorMessage(error)).toBe(message)
  })
})
