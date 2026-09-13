import type { buildApp } from '../../api/dist/app.js';
import { afterEach, vi } from 'vitest';
import { AxiosError } from 'axios';
import { http } from '../src/lib/http';
import { adapterResponse } from './axios-adapter';

const defaultAdapter = http.defaults.adapter;

afterEach(() => {
  http.defaults.adapter = defaultAdapter;
});

export function storage() {
  const items = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    clear: () => items.clear(),
  });

  return items;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/** Подключает настоящий конвейер Axios к изолированному API без сетевого сервера. */
export function injectAxios(app: Awaited<ReturnType<typeof buildApp>>) {
  const calls: { path: string; method: string; body: unknown; headers: Record<string, string> }[] =
    [];

  let drop: string | null = null;

  http.defaults.adapter = async (config) => {
    const headers = Object.fromEntries(
      Object.entries(config.headers.toJSON()).map(([name, value]) => [
        name.toLowerCase(),
        String(value),
      ]),
    );

    const method = (config.method ?? 'get').toUpperCase();
    const url = config.url!;

    calls.push({
      path: url,
      method,
      body: config.data ? JSON.parse(config.data) : null,
      headers,
    });

    const result = await app.inject({ url, method, headers, payload: config.data });

    if (drop === `${method} ${url}`) {
      drop = null;
      throw new AxiosError('Lost response', AxiosError.ERR_NETWORK, config);
    }

    return adapterResponse(
      config,
      [204, 304].includes(result.statusCode) ? '' : result.body,
      result.statusCode,
      result.headers as Record<string, string>,
    );
  };

  return {
    calls,
    dropNext: (path: string) => {
      drop = path;
    },
  };
}
