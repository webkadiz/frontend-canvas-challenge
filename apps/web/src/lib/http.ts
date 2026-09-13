import axios from 'axios';
import { isAcceptedStatus, normalizeResponse } from './http-response';
import { rejectApiError } from './api-error';

export { ApiError, asError } from './api-error';

/** Экземпляр Axios для API: JSON, отмена запросов и единая обработка ошибок. */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { Accept: 'application/json' },
  responseType: 'json',
  transitional: { silentJSONParsing: false },
  validateStatus: isAcceptedStatus,
});

http.interceptors.response.use(normalizeResponse, rejectApiError);
