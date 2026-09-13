// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpaceTitleDialog } from '../src/components/SpaceTitleDialog';
import style from '../src/components/SpaceTitleDialog.module.scss';

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

afterEach(() => {
  cleanup();
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

async function setup(
  onCreate = vi.fn<(title: string) => Promise<string | null>>().mockResolvedValue(null),
) {
  const user = userEvent.setup();

  render(<SpaceTitleDialog disabled={false} onSubmit={onCreate} />);

  const trigger = screen.getByRole('button', { name: 'Новое пространство' });

  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(trigger);

  return {
    user,
    trigger,
    onCreate,
    input: screen.getByRole('textbox', { name: 'Название' }) as HTMLInputElement,
  };
}

it('opens a named modal with focused input and restores focus on cancellation', async () => {
  const { user, trigger, input, onCreate } = await setup();

  expect(screen.getByRole('dialog', { name: 'Новое пространство' })).toBeDefined();
  expect(document.activeElement).toBe(input);
  expect(document.body.style.overflow).toBe('hidden');
  await user.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe('');
  expect(onCreate).not.toHaveBeenCalled();
});

it('closes on Escape and clears an abandoned title on the next opening', async () => {
  const { user, trigger, input } = await setup();

  await user.type(input, 'Черновик');
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(trigger);
  expect(input.value).toBe('');
});

it('rejects whitespace-only titles and submits a trimmed title with Enter', async () => {
  const { user, input, onCreate } = await setup();

  await user.type(input, '   ');
  expect(
    (screen.getByRole('button', { name: 'Создать пространство' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.submit(input.closest('form')!);
  expect(onCreate).not.toHaveBeenCalled();
  await user.type(input, 'Мой проект   {Enter}');
  expect(onCreate).toHaveBeenCalledExactlyOnceWith('Мой проект');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps errors and the entered title in the modal for correction', async () => {
  const onCreate = vi
    .fn<(title: string) => Promise<string | null>>()
    .mockResolvedValue('Сервер недоступен');

  const { user, input } = await setup(onCreate);

  await user.type(input, 'Идеи{Enter}');
  expect(screen.getByRole('alert').textContent).toBe('Сервер недоступен');
  expect(input.value).toBe('Идеи');
  expect(input.disabled).toBe(false);
  expect(screen.getByRole('dialog')).toBeDefined();
});

it('prevents duplicate submissions and cancellation while creating', async () => {
  let resolve!: (value: string | null) => void;

  const onCreate = vi.fn<(title: string) => Promise<string | null>>().mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );

  const { user, input } = await setup(onCreate);

  await user.type(input, 'Идеи{Enter}');
  fireEvent.submit(input.closest('form')!);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(onCreate).toHaveBeenCalledOnce();
  expect(screen.getByRole('dialog')).toBeDefined();
  expect(input.disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Отмена' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve(null));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps the modal and scroll lock until its closing animation finishes', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  );

  const { user } = await setup();

  await user.click(screen.getByRole('button', { name: 'Закрыть' }));

  const dialog = screen.getByRole('dialog');

  expect(dialog.classList.contains(style.isClosing)).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');

  const event = new Event('transitionend', { bubbles: true });

  Object.defineProperty(event, 'propertyName', { value: 'opacity' });
  fireEvent(dialog, event);
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('does not propagate keyboard shortcuts to the underlying canvas', async () => {
  const { user } = await setup();
  const listener = vi.fn();

  window.addEventListener('keydown', listener);

  try {
    await user.tab();
    listener.mockClear();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Отмена' }), {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
    });
    expect(listener).not.toHaveBeenCalled();
  } finally {
    window.removeEventListener('keydown', listener);
  }
});

it('prefills and selects the current title for renaming, then saves the trimmed replacement', async () => {
  const onSubmit = vi.fn<(title: string) => Promise<string | null>>().mockResolvedValue(null);
  const user = userEvent.setup();

  render(
    <SpaceTitleDialog
      mode="rename"
      initialTitle="Первое имя"
      disabled={false}
      onSubmit={onSubmit}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Переименовать пространство' }));

  const input = screen.getByRole('textbox', { name: 'Название' }) as HTMLInputElement;

  expect(input.value).toBe('Первое имя');
  expect(input.selectionStart).toBe(0);
  expect(input.selectionEnd).toBe(input.value.length);
  expect((screen.getByRole('button', { name: 'Сохранить' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  await user.keyboard('  Новое имя  {Enter}');
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Новое имя');
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('cancels a rename without submitting', async () => {
  const onSubmit = vi.fn<(title: string) => Promise<string | null>>().mockResolvedValue(null);
  const user = userEvent.setup();

  render(
    <SpaceTitleDialog
      mode="rename"
      initialTitle="Первое имя"
      disabled={false}
      onSubmit={onSubmit}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Переименовать пространство' }));
  await user.keyboard('Другое имя');
  await user.click(screen.getByRole('button', { name: 'Отмена' }));
  expect(onSubmit).not.toHaveBeenCalled();
});
