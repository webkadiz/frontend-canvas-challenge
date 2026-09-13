import type { Node } from '@xyflow/react';

/** Нода React Flow с данными и типами блоков приложения. */
export type FlowNode = Node<FlowNodeData, 'prompt' | 'generator' | 'result'>;

/** Данные, доступные компонентам нод React Flow. */
export type FlowNodeData = {
  /** Текст описания для генерации. */
  text?: string;
  /** Подпись блока, если она задана. */
  label?: string;
};
