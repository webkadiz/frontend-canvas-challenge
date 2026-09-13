import type { Draft, CanvasState, NodePosition, GraphIndex } from './types';
import { canvasText } from '../constants/workspace';
import type {
  GraphData,
  NodeData,
  GenerationData,
  GenerationRequest,
  SpaceData,
} from '@canvas/contracts';
import { api } from '../api';
import type { CanvasApi } from '../types';
import { Observable, poll } from '../lib/async';
import { asError, ApiError } from '../lib/http';
import { attempt, readStorage, saveStorage } from '../lib/storage';
import type { Attempt } from '../lib/types';
import { indexGraph, validConnection, chainReady, visibleResults, emptyGraph } from './graph';
import { SaveQueue } from './save-queue';
import { GraphHistory } from './history';
import { generationPhase, generationRunning } from './generation-state';

/** Управляет графом, историей правок, очередью сохранения и генерациями пространства. */
export class Canvas extends Observable<CanvasState> {
  index: GraphIndex = indexGraph(emptyGraph());
  saver?: SaveQueue;
  private history = new GraphHistory();
  private unsubscribe?: () => void;
  private monitors = new Map<string, AbortController>();
  private session = 0;
  private activeStart?: Promise<void>;
  private createdToOpen?: SpaceData;
  private lastAction: (() => Promise<void>) | null = null;

  /** Создаёт пустое состояние редактора с переданным клиентом API. */
  constructor(private client: CanvasApi = api) {
    super({
      ready: false,
      busy: false,
      error: null,
      spaces: [],
      space: null,
      graph: emptyGraph(),
      generations: [],
      byNode: new Map(),
      results: new Map(),
      starting: new Set(),
      jobErrors: new Map(),
      saved: { status: 'saved', error: null },
      draft: null,
      canvasKey: 0,
      canUndo: false,
      canRedo: false,
    });
  }

  /** Выполняет одно действие за раз и сохраняет ошибку и операцию для повтора. */
  run = async (action: () => Promise<void>) => {
    if (this.state.busy) return;

    this.lastAction = action;
    this.set({ busy: true, error: null });

    try {
      await action();
    } catch (error) {
      if (asError(error).code !== 'ABORTED') this.set({ error: asError(error) });
    } finally {
      this.set({ busy: false });
    }
  };

  /** Повторяет последнее действие модели с исходными параметрами. */
  retry = () => {
    if (this.lastAction) void this.run(this.lastAction);
  };

  /** Загружает список пространств и открывает последнее выбранное. */
  boot = () =>
    this.run(async () => {
      const spaces = (await this.client.spaces()).data;

      this.set({ spaces, ready: true });

      const id = readStorage<string | null>('canvas.space', null);
      const space = spaces.find((s) => s.id === id);

      if (space) await this.openSpace(space);
    });

  /** Создаёт пространство; после подтверждённого POST повторяет только его открытие. */
  create = (title: string) => {
    // После успешного POST повторяем только открытие пространства, не создавая новое.
    const name = title.trim() || canvasText.defaultTitle;
    let created = this.createdToOpen?.title === name ? this.createdToOpen : undefined;

    return this.run(async () => {
      if (!created) {
        created = (await this.client.createSpace(name)).data;
        this.createdToOpen = created;
        this.set({ spaces: [created, ...this.state.spaces] });
      }

      await this.openSpace(created);
      if (this.createdToOpen?.id === created.id) this.createdToOpen = undefined;
    });
  };

  /** Открывает выбранное пространство через общий обработчик действий. */
  open = (space: SpaceData) => this.run(() => this.openSpace(space));

  /** Проверяет название и обновляет его на сервере и в списке пространств. */
  rename = (title: string) => {
    const id = this.state.space?.id;

    return this.run(async () => {
      const name = title.trim();

      if (!id) return;

      if (!name || name.length > 80) throw new ApiError(canvasText.invalidTitle, 'FORM');

      if (this.state.space?.id === id && name === this.state.space.title) return;

      const space = (await this.client.renameSpace(id, name)).data;

      this.set({
        spaces: this.state.spaces.map((item) => (item.id === id ? space : item)),
        ...(this.state.space?.id === id ? { space } : {}),
      });
    });
  };

  /** Резервирует текущие правки и переключает граф, черновик и опросы на новое пространство. */
  private async openSpace(space: SpaceData) {
    await this.activeStart;
    await this.saver?.settle();
    this.backup();

    const previousSession = this.session;

    const [graph, jobs] = await Promise.all([
      this.client.graph(space.id),
      this.client.generations(space.id),
    ]);

    if (previousSession !== this.session) return;

    if (!graph.etag) throw new ApiError(canvasText.missingVersion, 'ETAG');

    this.close();

    const session = this.session;

    const draft =
      readStorage<Draft | null>(`canvas.draft.${space.id}`, null) ??
      readStorage<Draft | null>(`canvas.recovery.${space.id}`, null);

    saveStorage('canvas.space', space.id);
    this.index = indexGraph(graph.data);
    this.set({
      space,
      graph: graph.data,
      generations: jobs.data,
      starting: new Set(),
      jobErrors: new Map(),
      draft,
      canvasKey: this.state.canvasKey + 1,
    });
    this.attachSaver(graph.data, graph.etag, space.id);
    this.updateResults();

    for (const job of jobs.data) if (job.status === 'processing') this.watch(job, session);
  }

  /** Подключает очередь записи и резервирование черновика выбранного пространства. */
  private attachSaver(graph: GraphData, etag: string, id: string) {
    this.unsubscribe?.();
    this.saver?.dispose();

    const saver = new SaveQueue(graph, etag, {
      write: (value, tag) => this.client.save(id, value, tag),
      read: () => this.client.graph(id),
      backup: (value, tag) => saveStorage(`canvas.draft.${id}`, { graph: value, etag: tag }),
      clean: () => saveStorage(`canvas.draft.${id}`, null),
    });

    this.saver = saver;
    this.set({ saved: saver.state });
    this.unsubscribe = saver.subscribe(() => this.set({ saved: saver.state }));
  }

  /** Пересчитывает видимые результаты по текущим связям и последним генерациям. */
  private updateResults() {
    const { byNode, visible } = visibleResults(
      this.state.generations,
      this.index,
      this.state.starting,
    );

    this.set({ byNode, results: visible });
  }

  /** Применяет правку графа, обновляя историю и при необходимости индексы связей. */
  change = (graph: GraphData, topology = false, historyGroup?: string | false) => {
    if (historyGroup !== false) this.history.record(this.state.graph, graph, historyGroup);

    this.set({ graph, canUndo: this.history.canUndo, canRedo: this.history.canRedo });

    if (topology) {
      this.index = indexGraph(graph);
      this.updateResults();
    }

    try {
      this.saver?.update(graph);
    } catch (error) {
      this.set({ error: asError(error) });
    }
  };

  /** Завершает группу правок, чтобы следующий жест отменялся отдельно. */
  endHistoryGroup = () => this.history.endGroup();

  /** Возвращает предыдущий граф, сохраняя текущее положение камеры. */
  undo = () => {
    if (this.state.busy || this.state.starting.size) return;

    const graph = this.history.undo(this.state.graph);

    if (graph) this.change(graph, true, false);
  };

  /** Повторяет отменённое изменение, не меняя камеру. */
  redo = () => {
    if (this.state.busy || this.state.starting.size) return;

    const graph = this.history.redo(this.state.graph);

    if (graph) this.change(graph, true, false);
  };

  /** Добавляет ноду выбранного типа, соблюдая лимит графа. */
  add = (type: NodeData['type']) => {
    const graph = this.state.graph;

    if (graph.nodes.length >= 20) return;

    const position = {
      x: 40 + Math.min(900, (graph.nodes.length % 3) * 310),
      y: 110 + Math.floor(graph.nodes.length / 3) * 320,
    };

    const node: NodeData =
      type === 'prompt'
        ? { id: crypto.randomUUID(), type, position, data: { text: '' } }
        : {
            id: crypto.randomUUID(),
            type,
            position,
            data: { label: type === 'generator' ? canvasText.generator : canvasText.result },
          };

    this.change({ ...graph, nodes: [...graph.nodes, node] }, true);
  };

  /** Добавляет готовую цепочку промпт — генератор — результат, если хватает лимита. */
  starter = () => {
    if (this.state.graph.nodes.length > 17 || this.state.graph.edges.length > 18) return;

    const graph = this.state.graph,
      y = 110 + Math.ceil(graph.nodes.length / 3) * 320;

    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      c = crypto.randomUUID();

    const nodes: NodeData[] = [
      {
        id: a,
        type: 'prompt',
        position: { x: 40, y },
        data: { text: canvasText.examplePrompt },
      },
      { id: b, type: 'generator', position: { x: 365, y }, data: { label: canvasText.generator } },
      { id: c, type: 'result', position: { x: 690, y }, data: { label: canvasText.result } },
    ];

    this.change(
      {
        ...graph,
        nodes: [...graph.nodes, ...nodes],
        edges: [
          ...graph.edges,
          { id: crypto.randomUUID(), source: a, target: b },
          { id: crypto.randomUUID(), source: b, target: c },
        ],
      },
      true,
    );
  };

  /** Меняет текст одной ноды, сохраняя ссылки на остальные объекты. */
  editText = (id: string, text: string) => {
    const entry = this.index.nodes.get(id);

    if (!entry) return;

    const old = this.state.graph.nodes[entry.index];

    if (old.type !== 'prompt' || old.data.text === text) return;

    const nodes = this.state.graph.nodes.slice();

    nodes[entry.index] = { ...old, data: { text } };
    this.change({ ...this.state.graph, nodes }, false, `text:${id}`);
  };

  /** Применяет позиции одним проходом, ограничивая координаты и пропуская неизменившиеся. */
  positions = (positions: Map<string, NodePosition>) => {
    let changed = false;

    const nodes = this.state.graph.nodes.map((node) => {
      const next = positions.get(node.id);

      if (!next) return node;

      const x = Math.max(-10000, Math.min(10000, next.x));
      const y = Math.max(-10000, Math.min(10000, next.y));

      if (x === node.position.x && y === node.position.y) return node;

      changed = true;

      return {
        ...node,
        position: { x, y },
      };
    });

    if (changed) this.change({ ...this.state.graph, nodes }, false, 'drag');
  };

  /** Удаляет выбранные элементы и все связи удаляемых нод. */
  remove = (ids: Set<string>) => {
    const graph = this.state.graph,
      nodes: NodeData[] = [],
      edges: GraphData['edges'] = [];

    for (const node of graph.nodes) if (!ids.has(node.id)) nodes.push(node);

    for (const edge of graph.edges)
      if (!ids.has(edge.id) && !ids.has(edge.source) && !ids.has(edge.target)) edges.push(edge);

    if (nodes.length === graph.nodes.length && edges.length === graph.edges.length) return;

    this.change({ ...graph, nodes, edges }, true);
  };

  /** Удаляет только связи, сохраняя ноды и возможность отмены действия. */
  removeEdges = (ids: Set<string>) => {
    if (this.state.busy || this.state.starting.size) return;

    const graph = this.state.graph;
    const edges = graph.edges.filter((edge) => !ids.has(edge.id));

    if (edges.length === graph.edges.length) return;

    this.change({ ...graph, edges }, true);
  };

  /** Создаёт связь только при допустимых портах и свободном лимите. */
  connect = (source: string, target: string) => {
    if (this.state.graph.edges.length >= 20 || !validConnection(this.index, source, target))
      return false;

    this.change(
      {
        ...this.state.graph,
        edges: [...this.state.graph.edges, { id: crypto.randomUUID(), source, target }],
      },
      true,
    );

    return true;
  };

  /** Сохраняет камеру общей очередью без записи в историю и индикатора правок контента. */
  viewport = (viewport: GraphData['viewport']) => {
    const old = this.state.graph.viewport;

    if (old.x === viewport.x && old.y === viewport.y && old.zoom === viewport.zoom) return;

    const graph = { ...this.state.graph, viewport };

    // Сохраняем камеру через общую очередь, не отмечая содержимое графа изменённым.
    this.set({ graph });

    try {
      this.saver?.update(graph, 'viewport');
    } catch (error) {
      this.set({ error: asError(error) });
    }
  };

  /** Принудительно отправляет все накопленные изменения графа. */
  save = () =>
    this.run(async () => {
      await this.saver?.flush();
    });

  /** Сохраняет локальную recovery-копию перед чтением серверной версии графа. */
  reload = () =>
    this.run(async () => {
      if (!this.state.space) return;

      await this.activeStart;
      await this.saver?.settle();
      this.backup();

      const previous = { graph: this.state.graph, etag: this.saver!.etag };

      // Сохраняем данные восстановления до загрузки серверной версии, на случай ошибки GET.
      saveStorage(`canvas.recovery.${this.state.space.id}`, previous);
      await this.openSpace(this.state.space);
      this.set({ draft: previous });
    });

  /** Возвращает выбранный черновик и резервирует его до ближайшего автосохранения. */
  restore = () => {
    const draft = this.state.draft;

    if (!draft) return;

    this.change(draft.graph, true);
    // Восстановленный граф должен оставаться доступным даже до отложенного сохранения.
    try {
      this.saver?.backup();
      if (this.state.space) saveStorage(`canvas.recovery.${this.state.space.id}`, null);
      this.set({ canvasKey: this.state.canvasKey + 1, draft: null });
    } catch (error) {
      this.set({ error: asError(error), canvasKey: this.state.canvasKey + 1 });
    }
  };

  /** Формирует ключ незавершённой попытки для пространства и генератора. */
  private pendingKey(id: string) {
    return `canvas.attempt.${this.state.space!.id}.${id}`;
  }

  /** Проверяет наличие сохранённой неопределённой попытки генерации. */
  hasPending = (id: string) => !!(this.state.space && readStorage(this.pendingKey(id), null));

  /** Проверяет, собрана ли готовая цепочка для выбранного генератора. */
  readyToGenerate = (id: string) => chainReady(this.state.graph, this.index, id);

  /** Сначала сохраняет граф, затем запускает или точно повторяет запрос генерации. */
  generate = (id: string, scenario: GenerationRequest['scenario']) => {
    // Последовательно сохраняем граф и запускаем генерации; их состояния опрашиваем независимо.
    if (this.activeStart || !this.state.space) return;

    const phase = generationPhase({
      job: this.state.byNode.get(id),
      starting: false,
      pending: this.hasPending(id),
      ready: this.readyToGenerate(id),
      error: this.state.jobErrors.has(id),
    });

    if (generationRunning(phase)) return;

    const session = this.session,
      space = this.state.space;

    const starting = new Set(this.state.starting);

    starting.add(id);

    const errors = new Map(this.state.jobErrors);

    errors.delete(id);
    this.set({ starting, jobErrors: errors });
    this.updateResults();

    const work = (async () => {
      let pending = readStorage<Attempt<GenerationRequest> | null>(this.pendingKey(id), null);

      if (!pending) {
        if (!this.readyToGenerate(id))
          throw new ApiError(canvasText.incompleteChain, 'INCOMPLETE_CHAIN', 422);

        const etag = await this.saver!.flush();

        if (session !== this.session) return;

        pending = attempt({ nodeId: id, graphETag: etag, scenario });
        saveStorage(this.pendingKey(id), pending);
      }

      try {
        const reply = await this.client.generate(space.id, pending.body, pending.key);

        if (session !== this.session) return;

        saveStorage(this.pendingKey(id), null);
        this.receive(reply.data, true);

        if (reply.data.status === 'processing') this.watch(reply.data, session, reply.retryMs);
      } catch (error) {
        const parsed = asError(error);

        if (!parsed.uncertain) saveStorage(this.pendingKey(id), null);

        if (parsed.code === 'GENERATION_IN_PROGRESS') {
          const jobs = (await this.client.generations(space.id)).data;

          this.set({ generations: jobs });

          for (const job of jobs) if (job.status === 'processing') this.watch(job, session);
        }

        throw parsed;
      }
    })()
      .catch((error) => {
        if (session === this.session) {
          const jobErrors = new Map(this.state.jobErrors);

          jobErrors.set(id, asError(error));
          this.set({ jobErrors });
        }
      })
      .finally(() => {
        if (session === this.session) {
          const next = new Set(this.state.starting);

          next.delete(id);
          this.set({ starting: next });
          this.updateResults();
        }

        this.activeStart = undefined;
      });

    this.activeStart = work;
  };

  /** Обновляет попытку генерации и её отображение в текущем графе. */
  private receive(job: GenerationData, newest = false) {
    const jobs = this.state.generations;

    if (newest) this.set({ generations: [job, ...jobs.filter((old) => old.id !== job.id)] });
    else {
      const index = jobs.findIndex((old) => old.id === job.id);

      if (index < 0) return;

      const next = jobs.slice();

      next[index] = job;
      this.set({ generations: next });
    }

    this.updateResults();
  }

  /** Опрашивает генерацию до результата, игнорируя ответы прежней сессии пространства. */
  private watch(job: GenerationData, session: number, interval = 1000) {
    this.monitors.get(job.id)?.abort();

    const controller = new AbortController();

    this.monitors.set(job.id, controller);
    void poll(
      (signal) => this.client.generation(job.spaceId, job.id, signal).then((r) => r.data),
      (value) => value.status !== 'processing',
      (value) => {
        if (session === this.session) this.receive(value);
      },
      controller.signal,
      interval,
    )
      .catch((error) => {
        if (!controller.signal.aborted && session === this.session) {
          const errors = new Map(this.state.jobErrors);

          errors.set(job.nodeId, asError(error));
          this.set({ jobErrors: errors });
        }
      })
      .finally(() => {
        if (this.monitors.get(job.id) === controller) this.monitors.delete(job.id);
      });
  }

  /** Продолжает опрос после ошибки без нового запроса генерации. */
  resume = (id: string) => {
    const job = this.state.byNode.get(id);

    if (!job) return;

    const errors = new Map(this.state.jobErrors);

    errors.delete(id);
    this.set({ jobErrors: errors });
    this.watch(job, this.session);
  };

  /** Резервирует граф, если в очереди остались несохранённые изменения, включая камеру. */
  backup = () => {
    if (this.saver?.hasPendingChanges) this.saver.backup();
  };

  /** Останавливает опросы и очередь сохранения, очищая историю текущего пространства. */
  close = () => {
    this.history.clear();
    this.set({ canUndo: false, canRedo: false });
    this.session++;

    for (const controller of this.monitors.values()) controller.abort();

    this.monitors.clear();
    this.unsubscribe?.();
    this.saver?.dispose();
  };
}

export const canvas = new Canvas();
