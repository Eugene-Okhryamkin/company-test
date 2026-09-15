import { ApiError } from '@/shared/api/http-client'

/** User-facing, non-technical description of a failed request. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'network':
        return 'Нет соединения с сервером. Проверьте подключение.'
      case 'http':
        return `Сервер вернул ошибку (${error.status}).`
      case 'parse':
      case 'validation':
        return 'Сервер вернул данные в неожиданном формате.'
    }
  }
  return 'Не удалось загрузить данные.'
}
