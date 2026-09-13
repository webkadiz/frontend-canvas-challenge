// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useViewportInertia } from '../src/hooks/useViewportInertia';

let time: number;
let frame: FrameRequestCallback | null;
let preference: EventTarget & { matches: boolean };

beforeEach(() => {
  time = 0;
  frame = null;
  preference = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => preference);
  vi.spyOn(performance, 'now').mockImplementation(() => time);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frame = callback;

      return 1;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn(() => {
      frame = null;
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(className = 'react-flow__pane', eventType = 'mousedown') {
  const hook = renderHook(useViewportInertia);
  const setViewport = vi.fn().mockResolvedValue(true);
  const target = document.createElement('div');

  target.className = className;

  const event = new MouseEvent(eventType, { button: 0 });

  Object.defineProperty(event, 'target', { value: target });
  act(() => {
    hook.result.current.onInit({ setViewport });
    hook.result.current.onMoveStart(event, { x: 0, y: 0, zoom: 1 });
    time = 40;
    hook.result.current.onMove(new MouseEvent('mousemove'), { x: 20, y: 0, zoom: 1 });
    hook.result.current.onMoveEnd(new MouseEvent('mouseup'), { x: 20, y: 0, zoom: 1 });
  });

  return { ...hook, setViewport };
}

it('applies inertia only through the viewport API and ignores its programmatic callbacks', () => {
  const { result, setViewport } = setup();

  expect(frame).not.toBeNull();
  act(() => {
    result.current.onMoveStart(null, { x: 20, y: 0, zoom: 1 });
    frame?.(100);
  });
  expect(setViewport).toHaveBeenCalledWith(
    { x: expect.any(Number), y: 0, zoom: 1 },
    { duration: 0 },
  );
  expect(setViewport.mock.calls[0][0].x).toBeGreaterThan(20);
});

it.each(['react-flow__node', 'react-flow__minimap', 'react-flow__panel'])(
  'does not add inertia to %s',
  (className) => {
    setup(className);
    expect(frame).toBeNull();
  },
);

it('does not add inertia to wheel zoom', () => {
  setup('react-flow__pane', 'wheel');
  expect(frame).toBeNull();
});

it.each(['pointerdown', 'wheel', 'keydown', 'blur'])('stops on %s', (type) => {
  setup();
  act(() => {
    window.dispatchEvent(new Event(type));
  });
  expect(frame).toBeNull();
});

it('honors reduced motion and cancels when the preference changes', () => {
  const hook = setup();

  act(() => {
    preference.matches = true;
    preference.dispatchEvent(new Event('change'));
  });
  expect(frame).toBeNull();
  hook.unmount();
  time = 0;
  setup();
  expect(frame).toBeNull();
});

it('cancels on unmount, including when switching spaces', () => {
  const { unmount } = setup();

  unmount();
  expect(frame).toBeNull();
});
