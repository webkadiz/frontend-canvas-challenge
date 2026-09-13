import type { GraphIndex } from './types';
import type { GraphData, GenerationData } from '@canvas/contracts';

/** Создаёт пустой граф с начальным положением камеры. */
export const emptyGraph = (): GraphData => ({
  nodes: [],
  edges: [],
  viewport: { x: 70, y: 100, zoom: 1 },
});

/** За один проход по каждой коллекции строит индексы нод, входов и выходов. */
export function indexGraph(graph: GraphData): GraphIndex {
  const nodes: GraphIndex['nodes'] = new Map(),
    inputs = new Map<string, string>(),
    outputs = new Map<string, string>();

  for (let i = 0; i < graph.nodes.length; i++)
    nodes.set(graph.nodes[i].id, { index: i, type: graph.nodes[i].type });

  for (const edge of graph.edges) {
    inputs.set(edge.target, edge.source);

    if (nodes.get(edge.source)?.type === 'generator') outputs.set(edge.source, edge.target);
  }

  return { nodes, inputs, outputs };
}

/** Проверяет направления портов и ограничения на число связей входа и генератора. */
export function validConnection(index: GraphIndex, source: string, target: string) {
  const from = index.nodes.get(source)?.type,
    to = index.nodes.get(target)?.type;

  return (
    !index.inputs.has(target) &&
    ((from === 'prompt' && to === 'generator') ||
      (from === 'generator' && to === 'result' && !index.outputs.has(source)))
  );
}

/** Проверяет наличие непустого промпта и результата у генератора. */
export function chainReady(graph: GraphData, index: GraphIndex, id: string) {
  const input = index.inputs.get(id);
  const node = input ? index.nodes.get(input) : undefined;

  if (!node || !index.outputs.has(id)) return false;

  const prompt = graph.nodes[node.index];

  return prompt.type === 'prompt' && !!prompt.data.text.trim();
}

/** Привязывает последние попытки к текущим связям, исключая устаревшие изображения. */
export function visibleResults(
  generations: GenerationData[],
  index: GraphIndex,
  starting: ReadonlySet<string>,
) {
  const byNode = new Map<string, GenerationData>(),
    byResult = new Map<string, GenerationData>(),
    visible = new Map<string, GenerationData>();

  // API возвращает новые попытки первыми: первая определяет состояние генератора и результата.
  for (const job of generations) {
    if (!byNode.has(job.nodeId)) byNode.set(job.nodeId, job);

    if (!byResult.has(job.resultNodeId)) byResult.set(job.resultNodeId, job);
  }

  for (const [id, job] of byResult)
    if (
      !starting.has(job.nodeId) &&
      byNode.get(job.nodeId)?.id === job.id &&
      index.nodes.get(id)?.type === 'result' &&
      index.outputs.get(job.nodeId) === id
    )
      visible.set(id, job);

  return { byNode, visible };
}
