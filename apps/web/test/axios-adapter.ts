import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

/** Воспроизводит контракт адаптера Axios: HTTP-ошибки отклоняются до разбора JSON. */
export function adapterResponse(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): AxiosResponse {
  const response = {
    config,
    data,
    status,
    statusText: String(status),
    headers: AxiosHeaders.from(headers),
  };

  if (config.validateStatus && !config.validateStatus(status))
    throw new AxiosError(
      'Request failed',
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    );

  return response;
}
