import type { GenerationPhase, GenerationContext } from './types';

/** Определяет состояние генератора по готовности цепочки, запросу и результату. */
export function generationPhase({
  job,
  starting,
  pending,
  ready,
  error,
}: GenerationContext): GenerationPhase {
  if (starting) return 'starting';

  // Неподтверждённый запрос сохраняет тело и ключ даже после перезагрузки или изменения связей.
  if (pending) return 'uncertain';

  if (job?.status === 'processing') return error ? 'poll_error' : 'processing';

  if (job?.status === 'failed') return 'failed';

  if (job?.status === 'succeeded') return 'succeeded';

  return ready ? 'ready' : 'incomplete';
}

/** Считает генерацию активной и при временной ошибке проверки её статуса. */
export const generationRunning = (phase: GenerationPhase) =>
  phase === 'processing' || phase === 'poll_error';
