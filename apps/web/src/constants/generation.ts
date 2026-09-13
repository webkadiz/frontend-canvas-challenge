import type { GenerationPhase } from '../model/types';

export const generationLabel: Record<GenerationPhase, string> = {
  incomplete: 'Сгенерировать',
  ready: 'Сгенерировать',
  succeeded: 'Сгенерировать',
  starting: 'Сохраняем и запускаем…',
  uncertain: 'Повторить запрос',
  processing: 'Генерируем…',
  poll_error: 'Проверка приостановлена',
  failed: 'Попробовать снова',
};
