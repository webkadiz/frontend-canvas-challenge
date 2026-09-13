import { expect, it, vi } from 'vitest';
import { ViewportInertia } from '../src/model/viewport-inertia';

function setup() {
  let time = 0,
    id = 0;

  const frames = new Map<number, FrameRequestCallback>();
  const apply = vi.fn();

  const inertia = new ViewportInertia(apply, {
    now: () => time,
    request: (callback) => {
      frames.set(++id, callback);

      return id;
    },
    cancel: (key) => {
      frames.delete(key);
    },
  });

  return {
    inertia,
    apply,
    frames,
    at: (value: number) => {
      time = value;
    },
    frame: (value: number) => {
      time = value;

      const pending = [...frames.values()];

      frames.clear();

      for (const callback of pending) callback(time);
    },
  };
}

it('glides in the drag direction and decelerates to an exact stop without changing zoom', () => {
  const t = setup();

  t.inertia.start({ x: 0, y: 0, zoom: 2 });
  t.at(40);
  t.inertia.move({ x: 20, y: -10, zoom: 2 });
  t.at(80);
  t.inertia.move({ x: 40, y: -20, zoom: 2 });
  t.inertia.release({ x: 40, y: -20, zoom: 2 });

  for (const time of [80, 140, 200, 260, 320]) t.frame(time);

  const values = t.apply.mock.calls.map(([viewport]) => viewport);

  expect(values[0]).toEqual({ x: 40, y: -20, zoom: 2 });
  expect(values.at(-1)).toEqual({ x: 80, y: -40, zoom: 2 });

  const deltas = values.slice(1).map((viewport, index) => viewport.x - values[index].x);

  expect(deltas.every((delta) => delta > 0)).toBe(true);
  expect(deltas).toEqual([...deltas].sort((a, b) => b - a));
  expect(t.frames.size).toBe(0);
});

it('caps even a very fast flick at 90 screen pixels', () => {
  const t = setup();

  t.inertia.start({ x: 0, y: 0, zoom: 0.2 });
  t.at(10);
  t.inertia.move({ x: 1000, y: 1000, zoom: 0.2 });
  t.inertia.release({ x: 1000, y: 1000, zoom: 0.2 });
  t.frame(250);

  const end = t.apply.mock.calls[0][0];

  expect(Math.hypot(end.x - 1000, end.y - 1000)).toBeCloseTo(90);
  expect(end.zoom).toBe(0.2);
});

it.each(['click', 'paused', 'slow', 'zoom'] as const)('does not coast after %s', (kind) => {
  const t = setup();

  t.inertia.start({ x: 0, y: 0, zoom: 1 });
  t.at(40);

  if (kind !== 'click')
    t.inertia.move({ x: kind === 'slow' ? 1 : 20, y: 0, zoom: kind === 'zoom' ? 2 : 1 });

  if (kind === 'paused') t.at(140);

  t.inertia.release({ x: 20, y: 0, zoom: kind === 'zoom' ? 2 : 1 });
  expect(t.frames.size).toBe(0);
});

it('cancels all remaining frames on a new interaction', () => {
  const t = setup();

  t.inertia.start({ x: 0, y: 0, zoom: 1 });
  t.at(40);
  t.inertia.move({ x: 30, y: 0, zoom: 1 });
  t.inertia.release({ x: 30, y: 0, zoom: 1 });
  t.frame(70);
  expect(t.apply).toHaveBeenCalledOnce();
  t.inertia.cancel();
  t.frame(150);
  expect(t.apply).toHaveBeenCalledOnce();
  expect(t.frames.size).toBe(0);
});
