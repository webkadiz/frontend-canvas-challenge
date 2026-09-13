import { Type, Sparkles, Image } from 'lucide-react';
import type { PaletteItem } from './types';
import type { NodeData } from '@canvas/contracts';
import { workspaceText } from './workspace';

export const NODE_PALETTE = [
  { type: 'prompt', icon: Type, title: workspaceText.prompt, hint: workspaceText.promptHint },
  {
    type: 'generator',
    icon: Sparkles,
    title: workspaceText.generator,
    hint: workspaceText.generatorHint,
  },
  {
    type: 'result',
    icon: Image,
    title: workspaceText.result,
    hint: workspaceText.resultHint,
  },
] as const satisfies readonly PaletteItem[];

export const NODE_TITLES: Record<NodeData['type'], string> = {
  prompt: workspaceText.prompt,
  generator: workspaceText.generator,
  result: workspaceText.result,
};
