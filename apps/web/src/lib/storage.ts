import type { Attempt } from './types';
import { errorText } from '../constants/errors';

/** Читает JSON из localStorage, возвращая запасное значение при ошибке. */
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Сохраняет JSON или удаляет ключ для null; ошибки хранилища передаёт вызывающему коду. */
export function saveStorage(key: string, value: unknown) {
  // Ошибка доступа или переполнение хранилища должны прервать неповторяемое действие.
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(errorText.storageUnavailable);
  }
}

/** Фиксирует тело операции и новый ключ идемпотентности для последующих повторов. */
export function attempt<B>(body: B): Attempt<B> {
  return { key: crypto.randomUUID(), body };
}
