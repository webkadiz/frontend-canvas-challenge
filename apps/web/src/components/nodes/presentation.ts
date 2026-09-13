import { nodeText } from '../../constants/nodes';
import { generationRunning } from '../../model/generation-state';
import type { GenerationPhase } from '../../model/types';

/** Подбирает подсказку по состоянию генерации и готовности цепочки. */
export const generationHint = (phase: GenerationPhase, ready: boolean): string => {
  if (phase === 'uncertain') return nodeText.uncertainHint;

  if (phase === 'failed') return nodeText.failureHint;

  if (generationRunning(phase)) return nodeText.processingHint;

  if (!ready) return nodeText.incompleteHint;

  return nodeText.readyHint;
};
