import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { SaveQueue } from '../src/model/save-queue';
import { emptyGraph } from '../src/model/graph';
import { ApiError } from '../src/lib/http';
import { deferred } from './harness';
import type { GraphData } from '@canvas/contracts';

const graph = (x: number) => ({ ...emptyGraph(), viewport: { x, y: 0, zoom: 1 } });

const reply = (data: GraphData, etag: string) => ({ data, etag, status: 200, retryMs: 1000 });

let queues: SaveQueue[] = [];

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  queues.forEach((q) => q.dispose());
  queues = [];
  vi.useRealTimers();
});

function setup(
  write = vi.fn(async (g: GraphData) => reply(g, '"v2"')),
  read = vi.fn(async () => reply(emptyGraph(), '"v1"')),
) {
  const backup = vi.fn(),
    clean = vi.fn(),
    queue = new SaveQueue(emptyGraph(), '"v1"', { write, read, backup, clean });

  queues.push(queue);

  return { queue, write, read, backup, clean };
}

it('debounces bursts for exactly 500ms after the last edit; saves isolated changes', async () => {
  const { queue, write } = setup();

  queue.update(graph(1));
  await vi.advanceTimersByTimeAsync(300);
  queue.update(graph(2));
  await vi.advanceTimersByTimeAsync(499);
  expect(write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write).toHaveBeenCalledTimes(1);
  expect(write.mock.calls[0][0]).toEqual(graph(2));
  queue.update(graph(3));
  await vi.advanceTimersByTimeAsync(500);
  expect(write).toHaveBeenCalledTimes(2);
});

it('debounces viewport saves silently but still exposes failures and backs up pending state', async () => {
  const { queue, write, backup } = setup();
  queue.update(graph(1), 'viewport');
  await vi.advanceTimersByTimeAsync(300);
  queue.update(graph(2), 'viewport');
  expect(queue.state.status).toBe('saved');
  expect(queue.hasPendingChanges).toBe(true);
  queue.backup();
  expect(backup).toHaveBeenLastCalledWith(graph(2), '"v1"');
  await vi.advanceTimersByTimeAsync(499);
  expect(write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write).toHaveBeenCalledExactlyOnceWith(graph(2), '"v1"');
  expect(queue.hasPendingChanges).toBe(false);

  write.mockRejectedValueOnce(new ApiError('Conflict', 'GRAPH_VERSION_CONFLICT', 412));
  queue.update(graph(3), 'viewport');
  await expect(queue.flush()).rejects.toMatchObject({ status: 412 });
  expect(queue.state.status).toBe('conflict');
  expect(backup).toHaveBeenLastCalledWith(graph(3), '"v2"');
});

it('serializes camera changes and content edits through the same fresh ETag', async () => {
  const gate = deferred<ReturnType<typeof reply>>();

  const write = vi
    .fn()
    .mockImplementationOnce(() => gate.promise)
    .mockImplementation(async (g: GraphData) => reply(g, '"v3"'));

  const { queue } = setup(write);
  queue.update(graph(1), 'viewport');
  await vi.advanceTimersByTimeAsync(500);
  expect(queue.state.status).toBe('saved');
  queue.update(graph(2));
  expect(queue.state.status).toBe('saving');
  queue.update(graph(3), 'viewport');
  expect(queue.state.status).toBe('saving');
  const flushed = queue.flush();
  expect(write).toHaveBeenCalledTimes(1);
  gate.resolve(reply(graph(1), '"v2"'));
  await flushed;
  expect(write.mock.calls[1]).toEqual([graph(3), '"v2"']);
  expect(queue.state.status).toBe('saved');
  expect(queue.hasPendingChanges).toBe(false);
});

it('serializes slow saves, preserves edits, and flush drains pending state using new ETag', async () => {
  const gate = deferred<ReturnType<typeof reply>>();

  const write = vi
    .fn()
    .mockImplementationOnce(() => gate.promise)
    .mockImplementation(async (g: GraphData) => reply(g, '"v3"'));

  const { queue } = setup(write);

  queue.update(graph(1));
  await vi.advanceTimersByTimeAsync(500);
  queue.update(graph(2));

  const flush = queue.flush();

  expect(write).toHaveBeenCalledTimes(1);
  expect(queue.graph).toEqual(graph(2));
  gate.resolve(reply(graph(1), '"v2"'));
  await flush;
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[1]).toEqual([graph(2), '"v2"']);
  expect(queue.etag).toBe('"v3"');
  expect(queue.state.status).toBe('saved');
});

it('parallel flush callers never create parallel writes', async () => {
  const gate = deferred<ReturnType<typeof reply>>();

  const write = vi
    .fn()
    .mockImplementationOnce(() => gate.promise)
    .mockImplementation(async (g: GraphData) => reply(g, '"v3"'));

  const { queue } = setup(write);

  queue.update(graph(1));

  const first = queue.flush();

  queue.update(graph(2));

  const second = queue.flush();

  gate.resolve(reply(graph(1), '"v2"'));
  await Promise.all([first, second]);
  expect(write).toHaveBeenCalledTimes(2);
});

it('conflict preserves local draft, stops retries and blocks generation flush', async () => {
  const { queue, write, backup } = setup(
    vi.fn(async () => {
      throw new ApiError('Conflict', 'GRAPH_VERSION_CONFLICT', 412);
    }),
  );

  queue.update(graph(9));
  await expect(queue.flush()).rejects.toMatchObject({ status: 412 });
  expect(queue.state.status).toBe('conflict');
  expect(backup).toHaveBeenLastCalledWith(graph(9), '"v1"');
  queue.update(graph(10));
  await vi.advanceTimersByTimeAsync(2000);
  await expect(queue.flush()).rejects.toMatchObject({ status: 412 });
  expect(write).toHaveBeenCalledTimes(1);
  expect(queue.graph).toEqual(graph(10));
});

it('lost response is reconciled with the server snapshot without another PUT', async () => {
  const { queue, write, read } = setup(
    vi.fn(async () => {
      throw new ApiError('offline');
    }),
    vi.fn(async () => reply(graph(3), '"v2"')),
  );

  queue.update(graph(3));
  await expect(queue.flush()).resolves.toBe('"v2"');
  expect(write).toHaveBeenCalledTimes(1);
  expect(read).toHaveBeenCalledTimes(1);
});

it('ambiguous save with a different server version becomes a conflict', async () => {
  const { queue } = setup(
    vi.fn(async () => {
      throw new ApiError('offline');
    }),
    vi.fn(async () => reply(graph(7), '"other"')),
  );

  queue.update(graph(3));
  await expect(queue.flush()).rejects.toMatchObject({ status: 412 });
  expect(queue.graph).toEqual(graph(3));
});

it('an unsent offline save can be retried with its original version', async () => {
  const write = vi
    .fn()
    .mockRejectedValueOnce(new ApiError('offline'))
    .mockImplementation(async (g: GraphData) => reply(g, '"v2"'));

  const { queue } = setup(write);

  queue.update(graph(3));
  await expect(queue.flush()).rejects.toThrow();
  expect(queue.state.status).toBe('error');
  await queue.flush();
  expect(write.mock.calls[1][1]).toBe('"v1"');
});
