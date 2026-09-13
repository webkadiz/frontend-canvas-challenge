import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { buildApp } from '../../api/dist/app.js';
import { Canvas } from '../src/model/canvas';
import { api } from '../src/api';
import { indexGraph, validConnection, visibleResults } from '../src/model/graph';
import { storage, injectAxios } from './harness';

let app: Awaited<ReturnType<typeof buildApp>>,
  model: Canvas,
  http: ReturnType<typeof injectAxios>,
  now: number;

beforeEach(async () => {
  storage();
  now = Date.now();
  app = await buildApp({ now: () => now, generationDelayMs: 1500 });
  http = injectAxios(app);
  model = new Canvas();
  await model.create('Тест');
  model.starter();
});

afterEach(async () => {
  model.close();
  await app.close();
  vi.unstubAllGlobals();
});

const generator = () => model.state.graph.nodes[1].id;

it('removes only the selected edge and persists the change across reload', async () => {
  const { nodes, edges } = model.state.graph;

  model.removeEdges(new Set([edges[0].id]));
  expect(model.state.graph.nodes).toBe(nodes);
  expect(model.state.graph.edges).toEqual([edges[1]]);
  expect(model.index).toEqual(indexGraph(model.state.graph));
  expect(model.saver!.hasPendingChanges).toBe(true);
  await model.save();
  expect(model.state.error).toBeNull();
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.graph.nodes).toEqual(nodes);
  expect(model.state.graph.edges).toEqual([edges[1]]);
});

it('undoes and redoes removal of multiple edges as one action', () => {
  const { nodes, edges } = model.state.graph;

  model.removeEdges(new Set(edges.map((edge) => edge.id)));
  expect(model.state.graph.edges).toEqual([]);
  expect(model.state.graph.nodes).toBe(nodes);
  model.undo();
  expect(model.state.graph.edges).toEqual(edges);
  model.redo();
  expect(model.state.graph.edges).toEqual([]);
  expect(model.state.graph.nodes).toEqual(nodes);
});

it('ignores node IDs and missing IDs when removing edges', async () => {
  await model.save();
  const graph = model.state.graph;

  model.removeEdges(new Set([graph.nodes[0].id, 'missing-edge']));
  expect(model.state.graph).toBe(graph);
  expect(model.saver!.hasPendingChanges).toBe(false);
  model.undo();
  expect(model.state.graph.nodes).toEqual([]);
});

it.each(['retry', 'submit'] as const)(
  'reopens a confirmed new space after a failed GET via %s without another POST',
  async (mode) => {
    await model.save();

    const posts = () =>
      http.calls.filter((call) => call.method === 'POST' && call.path === '/api/spaces').length;

    const count = posts();
    const read = vi.spyOn(api, 'graph').mockRejectedValueOnce(new Error('Offline'));

    try {
      await model.create('New space');
      expect(model.state.error?.message).toBe('Offline');
      const created = model.state.spaces[0];
      expect(posts()).toBe(count + 1);

      if (mode === 'retry') {
        model.retry();
        await vi.waitFor(() => expect(model.state.busy).toBe(false));
      } else {
        await model.create('New space');
      }

      expect(model.state.error).toBeNull();
      expect(model.state.space?.id).toBe(created.id);
      expect(posts()).toBe(count + 1);
    } finally {
      read.mockRestore();
    }
  },
);

it('clamped positions and unknown removals do not add history or saves', async () => {
  const id = model.state.graph.nodes[0].id;
  model.positions(new Map([[id, { x: 10000, y: -10000 }]]));
  await model.save();
  const graph = model.state.graph;
  model.positions(new Map([[id, { x: 11000, y: -11000 }]]));
  model.remove(new Set(['missing-node']));
  expect(model.state.graph).toBe(graph);
  expect(model.saver!.hasPendingChanges).toBe(false);
  model.undo();
  expect(model.state.graph.nodes[0].position).not.toEqual(graph.nodes[0].position);
});

it('keeps topology indexes stable during typing and dragging', () => {
  const index = model.index;
  const id = model.state.graph.nodes[0].id;

  for (let i = 0; i < 30; i++) {
    model.editText(id, `Текст ${i}`);
    model.positions(new Map([[id, { x: i * 5, y: i * 3 }]]));
    expect(model.index).toBe(index);
  }

  model.add('result');
  expect(model.index).not.toBe(index);
});

it('replays a lost generation after reload but blocks double starts and processing restarts', async () => {
  const id = generator();
  const space = model.state.space!.id;
  const path = `/api/spaces/${space}/generations`;

  http.dropNext(`POST ${path}`);
  model.generate(id, 'success');
  model.generate(id, 'failure');
  await finishStart();
  expect(model.hasPending(id)).toBe(true);
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.byNode.get(id)?.status).toBe('processing');
  expect(model.hasPending(id)).toBe(true);
  model.generate(id, 'failure');
  await finishStart();
  expect(model.hasPending(id)).toBe(false);
  model.generate(id, 'success');
  await finishStart();

  const attempts = http.calls.filter((call) => call.method === 'POST' && call.path === path);

  expect(attempts).toHaveLength(2);
  expect(attempts[1].body).toEqual(attempts[0].body);
  expect(attempts[1].headers['idempotency-key']).toBe(attempts[0].headers['idempotency-key']);
  expect((await api.generations(space)).data).toHaveLength(1);
});

it('renames the selected space without reopening its graph or resetting unsaved history', async () => {
  const id = model.state.space!.id;
  const title = model.state.space!.title;
  const graph = model.state.graph;
  const saver = model.saver;
  const canvasKey = model.state.canvasKey;

  const writes = http.calls.filter(
    (call) => call.method === 'PUT' && call.path.endsWith('/graph'),
  ).length;

  await model.rename('  Новый проект  ');
  expect(model.state.error).toBeNull();
  expect(model.state.space).toMatchObject({ id, title: 'Новый проект' });
  expect(model.state.spaces.find((space) => space.id === id)?.title).toBe('Новый проект');
  expect(model.state.graph).toBe(graph);
  expect(model.saver).toBe(saver);
  expect(model.state.canvasKey).toBe(canvasKey);
  expect(model.state.canUndo).toBe(true);
  expect(model.state.saved.status).toBe('dirty');
  expect(
    http.calls.filter((call) => call.method === 'PUT' && call.path.endsWith('/graph')),
  ).toHaveLength(writes);
  expect((await api.spaces()).data.find((space) => space.id === id)?.title).toBe('Новый проект');
  model.undo();
  expect(model.state.graph.nodes).toHaveLength(0);
  expect(model.state.space?.title).not.toBe(title);
});

it('rejects invalid renames and leaves the previous title on request failure', async () => {
  const title = model.state.space!.title;
  const id = model.state.space!.id;

  await model.rename('   ');
  expect(model.state.error?.code).toBe('FORM');
  expect(model.state.space?.title).toBe(title);
  expect(
    http.calls.some((call) => call.method === 'PUT' && call.path === `/api/spaces/${id}`),
  ).toBe(false);
  await model.rename('x'.repeat(81));
  expect(model.state.error?.code).toBe('FORM');

  const rename = vi.spyOn(api, 'renameSpace').mockRejectedValue(new Error('Offline'));

  await model.rename('Новое имя');
  expect(model.state.error?.message).toBe('Offline');
  expect(model.state.space?.title).toBe(title);
  rename.mockRestore();
});

async function finishStart() {
  await vi.waitFor(() => expect(model.state.starting.size).toBe(0));
}

it('zoom and pan save the final camera without dirtying content or changing history', async () => {
  await model.save();

  const queued = model.saver!.graph;
  const writes = http.calls.filter((call) => call.method === 'PUT').length;
  const history = { undo: model.state.canUndo, redo: model.state.canRedo };

  for (let i = 1; i <= 10; i++) model.viewport({ x: i * 10, y: i * 20, zoom: 1 + i / 10 });

  expect(model.state.graph.viewport).toEqual({ x: 100, y: 200, zoom: 2 });
  expect(model.state.saved.status).toBe('saved');
  expect(model.saver!.graph.nodes).toBe(queued.nodes);
  expect(model.saver!.graph.edges).toBe(queued.edges);
  expect({ undo: model.state.canUndo, redo: model.state.canRedo }).toEqual(history);
  await model.save();
  expect(http.calls.filter((call) => call.method === 'PUT')).toHaveLength(writes + 1);
  expect((await api.graph(model.state.space!.id)).data.viewport).toEqual({
    x: 100,
    y: 200,
    zoom: 2,
  });
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.graph.viewport).toEqual({ x: 100, y: 200, zoom: 2 });
});

it('zoom does not clear or replace pending content changes', async () => {
  await model.save();

  const id = model.state.graph.nodes[0].id;

  model.editText(id, 'Новый текст');

  const queued = model.saver!.graph;

  expect(model.state.saved.status).toBe('dirty');
  model.viewport({ x: 300, y: 200, zoom: 0.5 });
  expect(model.state.saved.status).toBe('dirty');
  expect(model.saver!.graph.nodes).toBe(queued.nodes);
  expect(model.saver!.graph.viewport).toEqual({ x: 300, y: 200, zoom: 0.5 });
  await model.save();
  expect(model.state.saved.status).toBe('saved');
  expect((await api.graph(model.state.space!.id)).data.nodes[0].data).toEqual({
    text: 'Новый текст',
  });
});

it('undo restores a deleted node and its connections, then redo persists deletion', async () => {
  const original = structuredClone(model.state.graph);
  const id = generator();

  model.remove(new Set([id]));
  expect(model.state.graph.edges).toHaveLength(0);
  model.undo();
  expect(model.state.graph).toEqual(original);
  expect(model.readyToGenerate(id)).toBe(true);
  model.redo();
  expect(model.index.nodes.has(id)).toBe(false);
  await model.save();
  expect((await api.graph(model.state.space!.id)).data).toEqual(model.state.graph);
});

it('groups a drag into one undo and keeps zoom out of the history', () => {
  const id = model.state.graph.nodes[0].id;
  const before = structuredClone(model.state.graph.nodes);

  model.endHistoryGroup();
  model.positions(new Map([[id, { x: 100, y: 100 }]]));
  model.positions(new Map([[id, { x: 200, y: 200 }]]));
  model.endHistoryGroup();
  model.viewport({ x: 50, y: 50, zoom: 2 });
  model.undo();
  expect(model.state.graph.nodes).toEqual(before);
  expect(model.state.graph.viewport.zoom).toBe(2);
  model.redo();
  expect(model.state.graph.nodes[0].position).toEqual({ x: 200, y: 200 });
});

it('clears history when changing spaces and blocks undo during a generation start', async () => {
  const before = model.state.graph;

  model.generate(generator(), 'success');
  model.undo();
  expect(model.state.graph).toBe(before);
  await finishStart();
  await model.create('Второе пространство');
  expect(model.state.canUndo).toBe(false);
  expect(model.state.canRedo).toBe(false);
  model.undo();
  expect(model.state.graph.nodes).toHaveLength(0);
});

it('flushes unsaved edits before generating and restores the completed result', async () => {
  model.editText(model.state.graph.nodes[0].id, 'Последний текст');
  model.generate(generator(), 'success');
  await finishStart();
  expect(model.state.jobErrors.size).toBe(0);
  expect(model.state.generations[0].prompt).toBe('Последний текст');

  const writes = http.calls.filter(
    (c) => c.method === 'PUT' || (c.path.endsWith('/generations') && c.method === 'POST'),
  );

  expect(writes.map((c) => c.method)).toEqual(['PUT', 'POST']);
  now += 1600;
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.results.size).toBe(1);
  expect([...model.state.results.values()][0].status).toBe('succeeded');
});

it('lost generation response reuses key and body even when text changes before retry', async () => {
  const path = `/api/spaces/${model.state.space!.id}/generations`;

  http.dropNext(`POST ${path}`);
  model.generate(generator(), 'success');
  await finishStart();
  expect(model.hasPending(generator())).toBe(true);
  model.editText(model.state.graph.nodes[0].id, 'Изменённый текст');
  model.generate(generator(), 'failure');
  await finishStart();

  const attempts = http.calls.filter((c) => c.method === 'POST' && c.path === path);

  expect(attempts).toHaveLength(2);
  expect(attempts[0].body).toEqual(attempts[1].body);
  expect(attempts[0].headers['idempotency-key']).toBe(attempts[1].headers['idempotency-key']);
  expect((await api.generations(model.state.space!.id)).data).toHaveLength(1);
});

it('failure is an operation state; a fresh retry uses a new key', async () => {
  model.generate(generator(), 'failure');
  await finishStart();
  now += 1600;
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.byNode.get(generator())!.status).toBe('failed');
  model.generate(generator(), 'success');
  await finishStart();

  const attempts = http.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/generations'));

  expect(attempts).toHaveLength(2);
  expect(attempts[0].headers['idempotency-key']).not.toBe(attempts[1].headers['idempotency-key']);
});

it('a graph conflict blocks launch and retains the local graph for explicit recovery', async () => {
  await model.save();

  const id = model.state.space!.id;

  await api.save(
    id,
    { ...model.state.graph, viewport: { x: 777, y: 0, zoom: 1 } },
    model.saver!.etag,
  );
  model.editText(model.state.graph.nodes[0].id, 'Локальный черновик');
  model.generate(generator(), 'success');
  await finishStart();
  expect(model.state.saved.status).toBe('conflict');
  expect(model.state.graph.nodes[0].data).toEqual({ text: 'Локальный черновик' });
  expect((await api.generations(id)).data).toHaveLength(0);
  await model.reload();
  expect(model.state.graph.viewport.x).toBe(777);
  expect(model.state.draft!.graph.nodes[0].data).toEqual({ text: 'Локальный черновик' });
  model.editText(model.state.graph.nodes[0].id, 'Правка серверной версии');
  await model.save();
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.graph.nodes[0].data).toEqual({ text: 'Правка серверной версии' });
  expect(model.state.draft!.graph.nodes[0].data).toEqual({ text: 'Локальный черновик' });
  model.restore();
  await model.save();
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.graph.nodes[0].data).toEqual({ text: 'Локальный черновик' });
  expect(model.state.draft).toBeNull();
});

it('deleted or reconnected results never display an old generation', async () => {
  model.generate(generator(), 'success');
  await finishStart();

  const result = model.state.graph.nodes[2].id,
    edge = model.state.graph.edges[1].id;

  model.remove(new Set([edge]));
  expect(model.state.results.size).toBe(0);
  model.add('result');

  const another = model.state.graph.nodes.at(-1)!.id;

  model.connect(generator(), another);
  expect(model.state.results.has(another)).toBe(false);
  model.remove(new Set([result]));
  expect(model.state.graph.edges.every((e) => e.source !== result && e.target !== result)).toBe(
    true,
  );
});

it('newest attempt owns generator and result, preventing old successful images from resurfacing', async () => {
  model.generate(generator(), 'success');
  await finishStart();

  const first = model.state.generations[0];
  const latest = { ...first, id: 'new', status: 'failed' as const, imageUrl: null };

  const { visible } = visibleResults(
    [latest, { ...first, status: 'succeeded' as const, imageUrl: '/assets/demo.svg' }],
    model.index,
    new Set(),
  );

  expect(visible.get(first.resultNodeId)?.id).toBe('new');
});

it('validates ports and removes incident edges; unchanged node references survive text edits', () => {
  const before = model.state.graph.nodes,
    idx = indexGraph(model.state.graph);

  expect(validConnection(idx, before[2].id, before[0].id)).toBe(false);
  expect(validConnection(idx, before[0].id, before[1].id)).toBe(false);
  model.editText(before[0].id, 'Новый текст');
  expect(model.state.graph.nodes[1]).toBe(before[1]);
  expect(model.state.graph.nodes[2]).toBe(before[2]);
  model.remove(new Set([before[1].id]));
  expect(model.state.graph.edges).toEqual([]);
});

it('restores an active generation and stops polling after completion', async () => {
  model.generate(generator(), 'success');
  await finishStart();
  model.close();
  model = new Canvas();
  await model.boot();
  expect(model.state.byNode.get(generator())?.status).toBe('processing');
  now += 1600;
  await vi.waitFor(() => expect(model.state.byNode.get(generator())?.status).toBe('succeeded'), {
    timeout: 2500,
  });
});

it('closing a workspace stops future polls', async () => {
  model.generate(generator(), 'success');
  await finishStart();
  model.close();

  const count = http.calls.length;

  await new Promise((resolve) => setTimeout(resolve, 1100));
  expect(http.calls.length).toBe(count);
});

it('a failed space load leaves the current editor usable', async () => {
  await model.save();

  const original = api.graph;

  const altered = {
    ...api,
    graph: (id: string) => (id === 'missing' ? Promise.reject(new Error('offline')) : original(id)),
  };

  model.close();
  model = new Canvas(altered);
  await model.boot();

  const current = model.state.space!.id;

  await model.open({ ...model.state.space!, id: 'missing' });
  expect(model.state.space!.id).toBe(current);
  model.editText(model.state.graph.nodes[0].id, 'Правка после ошибки');
  await model.save();
  expect(model.state.saved.status).toBe('saved');
  expect((await api.graph(current)).data.nodes[0].data).toEqual({ text: 'Правка после ошибки' });
});
