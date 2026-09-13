import type { State, Persistence } from './types';
import { saveErrorText } from '../constants/errors';
import type { GraphData } from '@canvas/contracts';
import type { Reply } from '../lib/types';
import { ApiError, asError } from '../lib/http';
import { Observable } from '../lib/async';

/** Объединяет быстрые правки и последовательно сохраняет граф с актуальным ETag. */
export class SaveQueue extends Observable<State> {
  private revision = 0;
  private savedRevision = 0;
  private contentRevision = 0;
  private due = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight?: Promise<void>;
  private disposed = false;

  /** Принимает исходный граф, его ETag и операции записи и резервирования. */
  constructor(
    public graph: GraphData,
    public etag: string,
    private persistence: Persistence,
    private debounce = 500,
  ) {
    super({ status: 'saved', error: null });
  }

  /** Учитывает все несохранённые правки, в том числе фоновое изменение камеры. */
  get hasPendingChanges() {
    return this.savedRevision < this.revision;
  }

  /** Отделяет правки содержимого от камеры для индикатора сохранения. */
  private get hasContentChanges() {
    return this.savedRevision < this.contentRevision;
  }

  /** Обновляет ожидающий снимок и debounce; при конфликте сохраняет только локальную копию. */
  update(graph: GraphData, kind: 'content' | 'viewport' = 'content') {
    if (graph === this.graph || this.disposed) return;

    this.graph = graph;
    this.revision++;
    if (kind === 'content') this.contentRevision = this.revision;
    this.due = Date.now() + this.debounce;

    if (this.state.status === 'conflict') {
      this.backup();

      return;
    }

    this.set({
      status: this.hasContentChanges ? (this.inFlight ? 'saving' : 'dirty') : 'saved',
      error: null,
    });
    this.schedule();
  }

  /** Планирует запись после паузы от последнего изменения. */
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        void this.flush(false).catch(() => {});
      },
      Math.max(0, this.due - Date.now()),
    );
  }

  /** Передаёт актуальный граф и ETag в локальное резервное хранилище. */
  backup() {
    this.persistence.backup(this.graph, this.etag);
  }

  /** Последовательно записывает правки и возвращает свежий ETag; force обходит debounce. */
  async flush(force = true): Promise<string> {
    if (this.disposed) throw new ApiError(saveErrorText.closed, 'ABORTED');

    if (this.state.status === 'conflict') throw this.state.error!;

    if (force) clearTimeout(this.timer);

    if (this.inFlight) await this.inFlight;

    while (this.savedRevision < this.revision) {
      if (this.disposed) throw new ApiError(saveErrorText.closed, 'ABORTED');

      if (this.inFlight) {
        await this.inFlight;
        continue;
      }

      if (!force && Date.now() < this.due) {
        this.schedule();

        return this.etag;
      }

      const graph = this.graph,
        revision = this.revision,
        previousETag = this.etag;

      this.set({ status: this.hasContentChanges ? 'saving' : 'saved', error: null });
      this.inFlight = (async () => {
        this.persistence.backup(graph, previousETag);

        let reply: Reply<GraphData>;

        try {
          reply = await this.persistence.write(graph, previousETag);
        } catch (error) {
          const parsed = asError(error);

          if (!parsed.uncertain) throw parsed;

          // При потере ответа PUT проверяем сохранение отправленного снимка до повторной записи.
          const server = await this.persistence.read();

          if (JSON.stringify(server.data) === JSON.stringify(graph)) reply = server;
          else if (server.etag !== previousETag)
            throw new ApiError(saveErrorText.conflict, 'GRAPH_VERSION_CONFLICT', 412);
          else throw parsed;
        }

        if (!reply.etag) throw new ApiError(saveErrorText.missingVersion, 'ETAG');

        this.etag = reply.etag;
        this.savedRevision = revision;

        if (this.savedRevision === this.revision) this.persistence.clean();
        else this.backup();
      })();

      try {
        await this.inFlight;
      } catch (error) {
        const parsed = asError(error);

        this.set({ status: parsed.status === 412 ? 'conflict' : 'error', error: parsed });

        try {
          this.backup();
        } catch {
          // Сохраняем исходную ошибку операции для последующего восстановления.
        }

        throw parsed;
      } finally {
        this.inFlight = undefined;
      }
    }

    if (!this.disposed) this.set({ status: 'saved', error: null });

    return this.etag;
  }

  /** Отменяет таймер и дожидается уже отправленной записи без запуска новой. */
  async settle() {
    clearTimeout(this.timer);

    if (this.inFlight) {
      try {
        await this.inFlight;
      } catch {
        // Вызывающий код может перечитать данные, сохранив черновик.
      }
    }
  }

  /** Закрывает очередь и отменяет отложенное сохранение. */
  dispose() {
    clearTimeout(this.timer);
    this.disposed = true;
  }
}
