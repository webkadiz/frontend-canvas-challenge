// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestId } from '../src/components/RequestId';
import { ErrorNotice } from '../src/components/ErrorNotice';
import { ApiError } from '../src/lib/http';
import { commonText } from '../src/constants/common';

afterEach(cleanup);

it('renders a request identifier with its diagnostic label', () => {
  const { container } = render(<RequestId value="request-123" />);

  expect(container.querySelector('small')?.textContent).toBe(`${commonText.requestId}request-123`);
});

it('omits request details when no identifier is available', () => {
  const view = render(<RequestId />);

  expect(view.container.innerHTML).toBe('');
  view.rerender(<RequestId value="" />);
  expect(view.container.innerHTML).toBe('');
});

it('keeps error text, identifier and retry action together', async () => {
  const retry = vi.fn();
  const error = new ApiError('Failed', 'SERVER_ERROR', 500, [], 'request-123');

  render(<ErrorNotice error={error} retry={retry} />);

  const alert = screen.getByRole('alert');
  const user = userEvent.setup();

  expect(alert.textContent).toContain('Failed');
  expect(alert.querySelector('small')?.textContent).toBe(`${commonText.requestId}request-123`);
  await user.click(screen.getByRole('button', { name: commonText.retry }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('does not show cancelled operations or empty errors', () => {
  const view = render(<ErrorNotice error={new ApiError('Cancelled', 'ABORTED')} />);

  expect(screen.queryByRole('alert')).toBeNull();
  view.rerender(<ErrorNotice error={null} />);
  expect(screen.queryByRole('alert')).toBeNull();
});
