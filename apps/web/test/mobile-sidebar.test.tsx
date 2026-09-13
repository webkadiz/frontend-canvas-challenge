// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileSidebar } from '../src/components/MobileSidebar';
import { canvas } from '../src/model/canvas';
import { mobileText } from '../src/constants/mobile';

const showDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true })),
  );
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});

afterEach(async () => {
  cleanup();
  await Promise.resolve();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const [name, descriptor] of [
    ['showModal', showDescriptor],
    ['close', closeDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
  document.body.style.overflow = '';
});

it('opens an accessible dialog and restores focus and scrolling on close', async () => {
  render(<MobileSidebar state={canvas.state} />);

  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: mobileText.openNavigation });

  await user.click(trigger);
  expect(screen.getByRole('dialog', { name: mobileText.navigationTitle }).id).toBe(
    trigger.getAttribute('aria-controls'),
  );
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(document.body.style.overflow).toBe('hidden');
  await user.click(screen.getByRole('button', { name: mobileText.returnToCanvas }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe('');
});

it('keeps the sidebar open when its nested create dialog closes', async () => {
  render(<MobileSidebar state={canvas.state} />);

  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: mobileText.openNavigation }));
  await user.click(screen.getByRole('button', { name: 'Новое пространство' }));
  expect(screen.getByRole('dialog', { name: 'Новое пространство' })).toBeDefined();
  await user.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(screen.queryByRole('dialog', { name: 'Новое пространство' })).toBeNull();
  expect(screen.getByRole('dialog', { name: mobileText.navigationTitle })).toBeDefined();
  expect(document.body.style.overflow).toBe('hidden');
});

it('restores scrolling when both dialogs unmount at a desktop breakpoint', async () => {
  const view = render(<MobileSidebar state={canvas.state} />);
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: mobileText.openNavigation }));
  await user.click(screen.getByRole('button', { name: 'Новое пространство' }));
  view.unmount();
  await act(async () => {
    await Promise.resolve();
  });
  expect(document.querySelector('dialog[open]')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

it('closes via Escape without leaving the page locked', () => {
  render(<MobileSidebar state={canvas.state} />);
  fireEvent.click(screen.getByRole('button', { name: mobileText.openNavigation }));
  fireEvent(
    screen.getByRole('dialog', { name: mobileText.navigationTitle }),
    new Event('cancel', { cancelable: true }),
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

it('finishes animated closing even if the transition event never arrives', () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );
  render(<MobileSidebar state={canvas.state} />);
  fireEvent.click(screen.getByRole('button', { name: mobileText.openNavigation }));
  fireEvent.click(screen.getByRole('button', { name: mobileText.closeNavigation }));
  expect(screen.getByRole('dialog')).toBeDefined();
  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});
