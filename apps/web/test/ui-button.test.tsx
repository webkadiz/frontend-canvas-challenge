// @vitest-environment jsdom
import { createRef } from 'react';
import { Plus } from 'lucide-react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton } from '../src/components/ui';
import style from '../src/components/ui/Button/Button.module.scss';

afterEach(cleanup);

it('does not submit a form unless type is explicitly submit', async () => {
  const submit = vi.fn((event) => event.preventDefault());
  const click = vi.fn();

  render(
    <form onSubmit={submit}>
      <Button onClick={click}>Action</Button>
      <Button type="submit" name="action" value="save">
        Save
      </Button>
    </form>,
  );

  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: 'Action' }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0].nativeEvent.submitter.value).toBe('save');
});

it.each([true, 'true'] as const)(
  'blocks aria-disabled=%s without removing keyboard focus',
  async (disabled) => {
    const click = vi.fn();
    const submit = vi.fn((event) => event.preventDefault());

    render(
      <form onSubmit={submit}>
        <Button type="submit" aria-disabled={disabled} onClick={click}>
          Wait
        </Button>
      </form>,
    );

    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Wait' });

    await user.tab();
    expect(document.activeElement).toBe(button);
    expect(button.hasAttribute('disabled')).toBe(false);
    await user.keyboard('{Enter} ');
    await user.click(button);
    expect(document.activeElement).toBe(button);
    expect(click).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  },
);

it('keeps a focused button usable after the temporary lock is removed', async () => {
  const click = vi.fn();

  const view = render(
    <Button aria-disabled onClick={click}>
      Action
    </Button>,
  );

  const user = userEvent.setup();
  const button = screen.getByRole('button');

  await user.click(button);
  expect(click).not.toHaveBeenCalled();
  view.rerender(
    <Button aria-disabled={false} onClick={click}>
      Action
    </Button>,
  );
  expect(screen.getByRole('button')).toBe(button);
  expect(document.activeElement).toBe(button);
  await user.keyboard('{Enter}');
  expect(click).toHaveBeenCalledTimes(1);
});

it('honors native disabled and skips the button in tab order', async () => {
  const click = vi.fn();

  render(
    <>
      <Button disabled onClick={click}>
        Disabled
      </Button>
      <Button>Next</Button>
    </>,
  );

  const user = userEvent.setup();

  fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Next' }));
  expect(click).not.toHaveBeenCalled();
});

it.each(['primary', 'secondary', 'text'] as const)(
  'composes the %s variant with layout classes',
  (variant) => {
    render(
      <Button variant={variant} fullWidth className="layout">
        Action
      </Button>,
    );

    const button = screen.getByRole('button');

    expect(button.classList.contains(style[variant])).toBe(true);
    expect(button.classList.contains(style.fullWidth)).toBe(true);
    expect(button.classList.contains('layout')).toBe(true);
    expect(button.hasAttribute('variant')).toBe(false);
    expect(button.hasAttribute('fullwidth')).toBe(false);
  },
);

it('forwards icon-button ref, accessible name, title and pressed state to the native button', () => {
  const ref = createRef<HTMLButtonElement>();

  render(
    <IconButton ref={ref} aria-label="Add" title="Add item" aria-pressed>
      <Plus aria-hidden="true" />
    </IconButton>,
  );

  const button = screen.getByRole('button', { name: 'Add' });

  expect(ref.current).toBe(button);
  expect(button.title).toBe('Add item');
  expect(button.getAttribute('aria-pressed')).toBe('true');
  expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  ref.current?.focus();
  expect(document.activeElement).toBe(button);
});

it('leaves presentation to the caller when the variant is unstyled', () => {
  render(<Button className="custom">Action</Button>);
  expect(screen.getByRole('button').className).toBe('custom');
});
