import { errorText } from '../constants/errors';
import { ApiError } from './http';

/** Ожидает заданное время и освобождает таймер при отмене через AbortSignal. */
export function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new ApiError(errorText.pollAborted, 'ABORTED'));
    };

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);

    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

/** Опрашивает источник до конечного состояния; отменённые ответы не передаёт получателю. */
export async function poll<T>(
  read: (signal: AbortSignal) => Promise<T>,
  done: (value: T) => boolean,
  receive: (value: T) => void,
  signal: AbortSignal,
  interval = 1000,
) {
  while (!signal.aborted) {
    await delay(interval, signal);

    const value = await read(signal);

    if (signal.aborted) return;

    receive(value);

    if (done(value)) return;
  }
}

/** Хранит снимок состояния и уведомляет подписчиков при его обновлении. */
export class Observable<S> {
  private listeners = new Set<() => void>();

  /** Принимает исходный снимок состояния до появления подписчиков. */
  constructor(public state: S) {}

  /** Возвращает текущий снимок для useSyncExternalStore. */
  getSnapshot = () => this.state;

  /** Регистрирует слушателя и возвращает функцию его удаления. */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Создаёт новый снимок с частичным обновлением и уведомляет слушателей. */
  set(patch: Partial<S>) {
    this.state = { ...this.state, ...patch };

    for (const listener of this.listeners) listener();
  }
}
