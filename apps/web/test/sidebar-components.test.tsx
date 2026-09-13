// @vitest-environment jsdom
import type { SpaceData } from '@canvas/contracts';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpaceList } from '../src/components/CanvasSidebar/SpaceList';
import { SaveStatus } from '../src/components/SaveStatus';
import { canvas } from '../src/model/canvas';
import { saveLabels } from '../src/constants/workspace';
import style from '../src/App.module.scss';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const spaces: SpaceData[] = [
  { id: 'first', title: 'First space', createdAt: '2026-09-13T12:00:00Z', links: {} },
  { id: 'second', title: 'Second space', createdAt: '2026-09-13T12:00:00Z', links: {} },
];

it('marks the current space and opens the selected space', async () => {
  const open = vi.spyOn(canvas, 'open').mockResolvedValue();

  render(<SpaceList spaces={spaces} activeId="first" disabled={false} />);

  const user = userEvent.setup();
  const first = screen.getByRole('button', { name: 'First space' });
  const second = screen.getByRole('button', { name: 'Second space' });

  expect(first.classList.contains(style.active)).toBe(true);
  expect(second.classList.contains(style.active)).toBe(false);
  await user.click(second);
  expect(open).toHaveBeenCalledExactlyOnceWith(spaces[1]);
});

it('does not switch spaces while navigation is disabled', async () => {
  const open = vi.spyOn(canvas, 'open').mockResolvedValue();

  render(<SpaceList spaces={spaces} activeId="first" disabled />);

  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: 'Second space' }));
  expect(open).not.toHaveBeenCalled();
});

it.each(['saved', 'dirty', 'saving', 'error', 'conflict'] as const)(
  'announces the %s save state',
  (status) => {
    render(<SaveStatus status={status} />);

    const indicator = screen.getByRole('status');

    expect(indicator.textContent).toBe(saveLabels[status]);
    expect(indicator.classList.contains(style[status])).toBe(true);
  },
);
