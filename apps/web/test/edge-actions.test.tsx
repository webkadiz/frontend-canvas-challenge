// @vitest-environment jsdom
import { ReactFlowProvider } from '@xyflow/react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { EdgeActions } from '../src/components/EdgeActions';
import { canvasViewText } from '../src/constants/nodes';
import { canvas } from '../src/model/canvas';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('hides edge actions without selected connections', () => {
  render(
    <ReactFlowProvider>
      <EdgeActions count={0} onDelete={vi.fn()} />
    </ReactFlowProvider>,
  );

  expect(screen.queryByRole('button')).toBeNull();
});

it.each([1, 2])('deletes %s selected connections using the button', async (count) => {
  const onDelete = vi.fn();
  const user = userEvent.setup();

  render(
    <ReactFlowProvider>
      <EdgeActions count={count} onDelete={onDelete} />
    </ReactFlowProvider>,
  );

  const name = count === 1 ? canvasViewText.deleteEdge : canvasViewText.deleteEdges;

  await user.click(screen.getByRole('button', { name }));
  expect(onDelete).toHaveBeenCalledOnce();
});

it.each(['busy', 'starting'] as const)('blocks removal while %s', async (reason) => {
  const state = {
    ...canvas.state,
    busy: reason === 'busy',
    starting: new Set(reason === 'starting' ? ['generator'] : []),
  };

  vi.spyOn(canvas, 'getSnapshot').mockReturnValue(state);
  const onDelete = vi.fn();
  const user = userEvent.setup();

  render(
    <ReactFlowProvider>
      <EdgeActions count={1} onDelete={onDelete} />
    </ReactFlowProvider>,
  );

  const button = screen.getByRole('button', { name: canvasViewText.deleteEdge });

  expect(button.hasAttribute('disabled')).toBe(true);
  await user.click(button);
  expect(onDelete).not.toHaveBeenCalled();
});
