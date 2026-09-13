// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Alert, Button } from '../src/components/ui';

afterEach(cleanup);

it.each(['error', 'warning', 'info'] as const)(
  'announces %s messages with the appropriate role',
  (tone) => {
    render(
      <Alert tone={tone} title="Title">
        Message
      </Alert>,
    );
    const message = screen.getByRole(tone === 'error' ? 'alert' : 'status');
    expect(message.textContent).toBe('TitleMessage');
  },
);

it('preserves custom attributes, ref and the requested announcement role', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <Alert ref={ref} tone="warning" role="alert" className="custom" aria-label="Warning">
      Message
    </Alert>,
  );
  const message = screen.getByRole('alert', { name: 'Warning' });
  expect(ref.current).toBe(message);
  expect(message.classList.contains('custom')).toBe(true);
});

it('keeps actions interactive and respects disabled buttons', async () => {
  const retry = vi.fn();
  const user = userEvent.setup();
  render(
    <Alert
      actions={
        <>
          <Button onClick={retry}>Retry</Button>
          <Button disabled onClick={retry}>
            Disabled
          </Button>
        </>
      }
    >
      Message
    </Alert>,
  );
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await user.click(screen.getByRole('button', { name: 'Disabled' }));
  expect(retry).toHaveBeenCalledOnce();
});

it('does not render empty headings or action containers', () => {
  const { container } = render(<Alert>Message</Alert>);
  expect(container.querySelector('strong')).toBeNull();
  expect(screen.getByRole('status').children).toHaveLength(1);
});
