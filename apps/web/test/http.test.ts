import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import axios, { AxiosError, CanceledError, type AxiosAdapter } from 'axios';
import { http, ApiError } from '../src/lib/http';
import { toReply } from '../src/lib/http-response';
import { poll } from '../src/lib/async';
import { adapterResponse } from './axios-adapter';

const defaultAdapter = http.defaults.adapter;
const defaultBase = http.defaults.baseURL;

function json(data: unknown) {
  return JSON.stringify(data);
}

beforeEach(() => {
  http.defaults.baseURL = 'http://api';
});

afterEach(() => {
  http.defaults.adapter = defaultAdapter;
  http.defaults.baseURL = defaultBase;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Axios transport', () => {
  it('serializes JSON, preserves request headers and maps response metadata', async () => {
    const send = vi.fn<AxiosAdapter>(async (config) =>
      adapterResponse(config, json({ ok: true }), 201, { ETag: '"v1"', 'Retry-After': '2' }),
    );

    http.defaults.adapter = send;

    const reply = await http
      .post(
        '/api/items',
        { name: 'test' },
        { headers: { 'Idempotency-Key': 'once', 'If-Match': '"v0"' } },
      )
      .then(toReply);

    expect(reply).toEqual({ data: { ok: true }, etag: '"v1"', retryMs: 2000, status: 201 });

    const config = send.mock.calls[0][0];

    expect(axios.getUri(config)).toBe('http://api/api/items');
    expect(config.headers.get('Accept')).toBe('application/json');
    expect(config.headers.get('Content-Type')).toBe('application/json');
    expect(config.headers.get('Idempotency-Key')).toBe('once');
    expect(config.headers.get('If-Match')).toBe('"v0"');
    expect(config.headers.has('Authorization')).toBe(false);
    expect(config.data).toBe('{"name":"test"}');
  });

  it.each([204, 304])(
    'accepts an empty %s response without parsing or unwrapping',
    async (status) => {
      http.defaults.adapter = async (config) =>
        adapterResponse(config, '', status, { ETag: '"v2"' });
      expect(await http.get('/test').then(toReply)).toEqual({
        data: undefined,
        status,
        etag: '"v2"',
        retryMs: 1000,
      });
    },
  );

  it('accepts empty HEAD and successful responses', async () => {
    http.defaults.adapter = async (config) => adapterResponse(config, '');
    expect((await http.head('/test')).data).toBeUndefined();
    expect((await http.get('/test')).data).toBeUndefined();
  });

  it('preserves status, request id and field errors', async () => {
    http.defaults.adapter = async (config) =>
      adapterResponse(
        config,
        JSON.stringify({
          error: {
            code: 'VALIDATION',
            message: 'Check fields',
            fields: [{ path: 'body/email', message: 'invalid' }],
          },
        }),
        422,
        { 'X-Request-Id': 'request-422' },
      );

    await expect(http.post('/test', {})).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION',
      requestId: 'request-422',
      uncertain: false,
      fields: [{ path: 'body/email', message: 'invalid' }],
    });
  });

  it.each([200, 401, 409, 500])(
    'preserves certainty of malformed JSON with HTTP %s',
    async (status) => {
      http.defaults.adapter = async (config) =>
        adapterResponse(config, '<html>', status, { 'X-Request-Id': 'bad-json' });
      await expect(http.get('/test')).rejects.toMatchObject({
        code: 'PARSE',
        status: status === 200 ? 0 : status,
        requestId: 'bad-json',
        uncertain: status === 200 || status >= 500,
      });
    },
  );

  it.each([401, 409, 429, 500])('normalizes an API failure with HTTP %s', async (status) => {
    http.defaults.adapter = async (config) =>
      adapterResponse(
        config,
        JSON.stringify({ error: { code: 'FAILURE', message: 'Rejected' } }),
        status,
      );
    await expect(http.get('/test')).rejects.toMatchObject({
      code: 'FAILURE',
      message: 'Rejected',
      status,
      uncertain: status >= 500,
    });
  });

  it('uses the HTTP fallback for an empty error body', async () => {
    http.defaults.adapter = async (config) => adapterResponse(config, '', 503);
    await expect(http.get('/test')).rejects.toMatchObject({
      code: 'HTTP',
      status: 503,
      uncertain: true,
    });
  });

  it('normalizes network failure without repeating a mutation', async () => {
    const send = vi.fn<AxiosAdapter>(async (config) => {
      throw new AxiosError('Offline', AxiosError.ERR_NETWORK, config);
    });

    http.defaults.adapter = send;

    await expect(http.post('/test', {})).rejects.toMatchObject({
      code: 'NETWORK',
      status: 0,
      uncertain: true,
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not dispatch an already aborted request', async () => {
    const send = vi.fn<AxiosAdapter>();
    const controller = new AbortController();

    http.defaults.adapter = send;
    controller.abort();

    await expect(http.get('/test', { signal: controller.signal })).rejects.toMatchObject({
      code: 'ABORTED',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('passes cancellation to the adapter and normalizes cancellation errors', async () => {
    const controller = new AbortController();

    const send = vi.fn<AxiosAdapter>(
      (config) =>
        new Promise((_resolve, reject) => {
          config.signal?.addEventListener?.('abort', () =>
            reject(new CanceledError(undefined, config)),
          );
        }),
    );

    http.defaults.adapter = send;

    const pending = http.get('/test', { signal: controller.signal });
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ABORTED' });

    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0][0].signal).toBe(controller.signal);
    controller.abort();
    await rejected;
  });

  it.each(['0', '-1', 'invalid', 'Infinity'])(
    'uses a safe polling delay for Retry-After=%s',
    async (retry) => {
      http.defaults.adapter = async (config) =>
        adapterResponse(config, json({}), 200, { 'Retry-After': retry });
      expect((await http.get('/test').then(toReply)).retryMs).toBe(1000);
    },
  );

  it('accepts raw API data without a shop envelope', async () => {
    http.defaults.adapter = async (config) =>
      adapterResponse(config, JSON.stringify([{ id: 'space' }]));
    expect((await http.get('/test')).data).toEqual([{ id: 'space' }]);
  });

  it('exposes errors in the application format', async () => {
    http.defaults.adapter = async (config) => {
      throw new AxiosError('Offline', AxiosError.ERR_NETWORK, config);
    };
    await expect(http.get('/test')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('polling lifecycle', () => {
  it('stops at terminal state', async () => {
    vi.useFakeTimers();

    let calls = 0;
    const receive = vi.fn();
    const controller = new AbortController();

    const done = poll(
      async () => ++calls,
      (v) => v === 2,
      receive,
      controller.signal,
      100,
    );

    await vi.advanceTimersByTimeAsync(1000);
    await done;
    expect(calls).toBe(2);
    expect(receive).toHaveBeenCalledTimes(2);
  });
  it('ignores an in-flight result after cancellation', async () => {
    vi.useFakeTimers();

    let finish!: (v: number) => void;

    const receive = vi.fn(),
      controller = new AbortController();

    const done = poll(
      () => new Promise<number>((resolve) => (finish = resolve)),
      () => true,
      receive,
      controller.signal,
      100,
    );

    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    finish(1);
    await done;
    expect(receive).not.toHaveBeenCalled();
  });
});
