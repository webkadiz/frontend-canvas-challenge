import { PromptNode } from './PromptNode';
import { GeneratorNode } from './GeneratorNode';
import { ResultNode } from './ResultNode';

export type { FlowNode } from './types';

export const nodeTypes = { prompt: PromptNode, generator: GeneratorNode, result: ResultNode };
