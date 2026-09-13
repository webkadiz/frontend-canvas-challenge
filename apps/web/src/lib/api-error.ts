import { AxiosHeaders, isAxiosError, isCancel } from 'axios';
import type { ValidationField, ApiErrorResponse } from './types';
import { errorText } from '../constants/errors';

/** Единый формат ошибок сети и API с деталями полей и идентификатором запроса. */
export class ApiError extends Error {
  /** Сохраняет код, HTTP-статус и дополнительные сведения об ошибке. */
  constructor(
    message: string,
    readonly code = 'NETWORK',
    readonly status = 0,
    readonly fields: ValidationField[] = [],
    readonly requestId?: string,
  ) {
    super(message);
  }

  /** Указывает, что по ошибке нельзя надёжно определить исход запроса на сервере. */
  get uncertain() {
    return this.status === 0 || this.status >= 500;
  }
}

/** Приводит ошибки Axios и приложения к формату, который понимают модели и интерфейс. */
export function asError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isCancel(error)) return new ApiError(errorText.aborted, 'ABORTED');

  if (!isAxiosError<ApiErrorResponse>(error))
    return new ApiError(error instanceof Error ? error.message : errorText.unexpected);

  const response = error.response;

  const requestId = AxiosHeaders.from(response?.headers as AxiosHeaders | undefined).get(
    'x-request-id',
  );

  const id = typeof requestId === 'string' ? requestId : undefined;

  if (error.cause instanceof SyntaxError || error.name === 'SyntaxError')
    return new ApiError(
      errorText.invalidResponse,
      'PARSE',
      response && response.status >= 400 ? response.status : 0,
      [],
      id,
    );

  if (!response) return new ApiError(errorText.offline);

  const detail = response.data?.error;

  return new ApiError(
    detail?.message ?? errorText.requestFailed,
    detail?.code ?? 'HTTP',
    response.status,
    detail?.fields,
    id,
  );
}

/** Завершает цепочку Axios ошибкой приложения, сохраняя статус и сведения о запросе. */
export function rejectApiError(error: unknown): never {
  throw asError(error);
}
