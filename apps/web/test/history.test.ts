import { expect, it, vi } from 'vitest';
import { GraphHistory } from '../src/model/history';
import { emptyGraph } from '../src/model/graph';

const graph = (text: string) => ({
  ...emptyGraph(),
  nodes: [
    {
      id: 'text',
      type: 'prompt' as const,
      position: { x: 0, y: 0 },
      data: { text },
    },
  ],
});

it('shares immutable snapshots without cloning or serializing on each drag frame', () => {
  const history = new GraphHistory();
  const initial = graph('Original');
  let current = initial;
  const stringify = vi.spyOn(JSON, 'stringify');
  const clone = vi.spyOn(globalThis, 'structuredClone');

  try {
    for (let i = 1; i <= 60; i++) {
      const next = { ...current, nodes: [{ ...current.nodes[0], position: { x: i, y: i } }] };
      history.record(current, next, 'drag');
      current = next;
    }

    expect(stringify).not.toHaveBeenCalled();
    expect(clone).not.toHaveBeenCalled();
    const previous = history.undo(current)!;
    expect(previous.nodes).toBe(initial.nodes);
    expect(previous.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(history.canUndo).toBe(false);
    expect(history.redo(previous)!.nodes).toBe(current.nodes);
  } finally {
    stringify.mockRestore();
    clone.mockRestore();
  }
});

it('groups continuous edits and preserves the current viewport on undo and redo', () => {
  const history = new GraphHistory();

  history.record(graph(''), graph('a'), 'text');
  history.record(graph('a'), graph('ab'), 'text');

  const current = { ...graph('ab'), viewport: { x: 500, y: 300, zoom: 2 } };
  const previous = history.undo(current)!;

  expect(previous.nodes).toEqual(graph('').nodes);
  expect(previous.viewport).toEqual(current.viewport);
  expect(history.canUndo).toBe(false);
  expect(history.redo(previous)).toEqual(current);
});

it('separates consecutive gestures and discards redo after a new edit', () => {
  const history = new GraphHistory();

  history.record(graph('a'), graph('b'), 'drag');
  history.endGroup();
  history.record(graph('b'), graph('c'), 'drag');

  const previous = history.undo(graph('c'))!;

  expect(previous.nodes).toEqual(graph('b').nodes);
  expect(history.canRedo).toBe(true);
  history.record(previous, graph('d'));
  expect(history.canRedo).toBe(false);
  expect(history.redo(graph('d'))).toBeUndefined();
});

it('ignores no-ops and limits history to 50 actions', () => {
  const history = new GraphHistory();

  history.record(graph('0'), graph('0'));
  expect(history.canUndo).toBe(false);

  for (let i = 0; i < 60; i++) history.record(graph(String(i)), graph(String(i + 1)));

  let current = graph('60');

  for (let i = 0; i < 50; i++) current = history.undo(current)!;

  expect(current.nodes).toEqual(graph('10').nodes);
  expect(history.canUndo).toBe(false);
  history.clear();
  expect(history.canRedo).toBe(false);
});
