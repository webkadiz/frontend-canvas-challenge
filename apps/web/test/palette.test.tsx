// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NodePalette } from '../src/components/NodePalette';
import { KeyboardConnection } from '../src/components/KeyboardConnection';
import { NodeSelect } from '../src/components/NodeSelect';
import { canvas } from '../src/model/canvas';
import type { GraphData } from '@canvas/contracts';
import { generationHint } from '../src/components/nodes/presentation';
import { RESULT_PRESENTATION } from '../src/constants/nodes';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  ['prompt', /Текст/],
  ['generator', /Генератор/],
  ['result', /Результат/],
] as const)('keeps the %s palette entry wired to its node type', (type, label) => {
  const add = vi.spyOn(canvas, 'add').mockImplementation(() => {});
  render(<NodePalette disabled={false} />);
  fireEvent.click(screen.getByRole('button', { name: label }));
  expect(add).toHaveBeenCalledExactlyOnceWith(type);
});

it('disables every palette action together', () => {
  render(<NodePalette disabled />);
  expect(
    screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);
});

it('preserves the selected node and forwards its ID through the shared selector', () => {
  const onChange = vi.fn();

  const nodes: GraphData['nodes'] = [
    { id: 'prompt-a', type: 'prompt', position: { x: 0, y: 0 }, data: { text: 'Example' } },
    { id: 'generator-a', type: 'generator', position: { x: 100, y: 0 }, data: {} },
  ];

  render(<NodeSelect label="Source" nodes={nodes} value="prompt-a" onChange={onChange} />);

  const select = screen.getByRole('combobox', { name: 'Source' }) as HTMLSelectElement;

  expect(select.value).toBe('prompt-a');
  expect(select.selectedOptions[0].textContent).toBe('Текст · prom');
  fireEvent.change(select, { target: { value: 'generator-a' } });
  expect(onChange).toHaveBeenCalledExactlyOnceWith('generator-a');
});

it('filters connection endpoints and submits their IDs', () => {
  const connect = vi.spyOn(canvas, 'connect').mockReturnValue(true);

  const nodes: GraphData['nodes'] = [
    { id: 'prompt-a', type: 'prompt', position: { x: 0, y: 0 }, data: { text: 'Example' } },
    { id: 'generator-a', type: 'generator', position: { x: 100, y: 0 }, data: {} },
    { id: 'result-a', type: 'result', position: { x: 200, y: 0 }, data: {} },
  ];
  render(<KeyboardConnection nodes={nodes} disabled={false} />);
  fireEvent.click(screen.getByText('Соединить с клавиатуры'));
  const source = screen.getByLabelText('Откуда') as HTMLSelectElement;
  const target = screen.getByLabelText('Куда') as HTMLSelectElement;
  expect([...source.options].map((option) => option.value)).toEqual([
    '',
    'prompt-a',
    'generator-a',
  ]);
  expect([...target.options].map((option) => option.value)).toEqual([
    '',
    'generator-a',
    'result-a',
  ]);
  fireEvent.change(source, { target: { value: 'prompt-a' } });
  fireEvent.change(target, { target: { value: 'generator-a' } });
  fireEvent.submit(source.closest('form')!);
  expect(connect).toHaveBeenCalledExactlyOnceWith('prompt-a', 'generator-a');
  expect(screen.getByRole('status').textContent).toBe('Связь добавлена.');
});

it('preserves hint priority for uncertain, failed and still-running generations', () => {
  expect(generationHint('uncertain', false)).toBe(
    'Ответ потерян. Повторим тот же запрос без новой генерации.',
  );
  expect(generationHint('failed', false)).toBe('Тестовый отказ. Снимите флажок и повторите.');
  expect(generationHint('poll_error', false)).toBe('Ожидаем изображение от сервера.');
  expect(generationHint('incomplete', false)).toBe('Нужны текст и связанный результат.');
  expect(generationHint('ready', true)).toBe('Локальное изображение · без списаний');
});

it('keeps the empty preview fallback even when a succeeded job has no image URL', () => {
  expect(RESULT_PRESENTATION.succeeded.title).toBe('Здесь будет изображение');
  expect(RESULT_PRESENTATION.succeeded.status).toBe('Готово');
  expect(RESULT_PRESENTATION.failed.title).toBe('Не удалось создать');
});
