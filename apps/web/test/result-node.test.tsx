// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { GenerationData } from '@canvas/contracts';
import type { NodeProps } from '@xyflow/react';
import { ResultNode } from '../src/components/nodes/ResultNode';
import type { FlowNode } from '../src/components/nodes/types';
import { canvas } from '../src/model/canvas';

// Ports need a React Flow store; the preview itself only reads the current generation.
vi.mock('@xyflow/react', () => ({ Handle: () => null, Position: { Left: 'left' } }));

const props: NodeProps<FlowNode> = {
  id: 'result-a',
  type: 'result',
  data: {},
  selected: false,
  dragging: false,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  zIndex: 0,
  draggable: true,
  deletable: true,
  selectable: true,
};

const generation: GenerationData = {
  id: 'job-a',
  spaceId: 'space-a',
  nodeId: 'generator-a',
  resultNodeId: props.id,
  prompt: 'Тихое озеро',
  graphETag: '"1"',
  scenario: 'success',
  status: 'succeeded',
  createdAt: '2026-09-13T10:00:00Z',
  imageUrl: '/assets/example.svg',
  failureCode: null,
  links: {},
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('shows the initial preview and status before any generation', () => {
  vi.spyOn(canvas.state.results, 'get').mockReturnValue(undefined);
  render(<ResultNode {...props} />);
  expect(screen.getByText('Здесь будет изображение')).toBeDefined();
  expect(screen.getByText('Соедините ноды и запустите генератор')).toBeDefined();
  expect(screen.getByText('Ожидает генерации')).toBeDefined();
});

it('shows the completed image with the prompt as alternative text', () => {
  vi.spyOn(canvas.state.results, 'get').mockReturnValue(generation);
  render(<ResultNode {...props} />);
  expect(screen.getByRole('img', { name: generation.prompt }).getAttribute('src')).toBe(
    '/assets/example.svg',
  );
  expect(screen.getByText('Готово')).toBeDefined();
  expect(screen.queryByText('Здесь будет изображение')).toBeNull();
});

it('shows failure feedback without an image', () => {
  vi.spyOn(canvas.state.results, 'get').mockReturnValue({
    ...generation,
    status: 'failed',
    imageUrl: null,
  });
  render(<ResultNode {...props} />);
  expect(screen.getByText('Не удалось создать')).toBeDefined();
  expect(screen.getByText('Повторите запуск в генераторе')).toBeDefined();
  expect(screen.queryByRole('img')).toBeNull();
});
