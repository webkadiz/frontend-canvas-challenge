// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMediaQuery } from '../src/hooks/useMediaQuery';
import { MOBILE_QUERY } from '../src/constants/mobile';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('follows breakpoint changes and removes its listener on unmount', () => {
  const listeners = new Set<() => void>();

  const media = {
    matches: true,
    addEventListener: vi.fn((_event, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_event, listener) => listeners.delete(listener)),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );

  const hook = renderHook(() => useMediaQuery(MOBILE_QUERY));

  expect(hook.result.current).toBe(true);
  act(() => {
    media.matches = false;
    listeners.forEach((listener) => listener());
  });
  expect(hook.result.current).toBe(false);
  hook.unmount();
  expect(listeners.size).toBe(0);
});
