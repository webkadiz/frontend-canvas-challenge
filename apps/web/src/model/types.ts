import type { GraphData, GenerationData, SpaceData, NodeData } from '@canvas/contracts';
import type { ApiError } from '../lib/http';
import type { SaveQueue } from './save-queue';
import type { Reply } from '../lib/types';

/** Восстановительный снимок графа с исходной версией сервера. */
export type Draft = {
  /** Граф, сохранённый в локальном черновике. */
  graph: GraphData;
  /** Версия сервера, на основе которой сделан черновик. */
  etag: string;
};

/** Текущее состояние редактора, сохранения и генераций. */
export type CanvasState = {
  /** Завершена ли начальная загрузка редактора. */
  ready: boolean;
  /** Выполняется ли операция, блокирующая действия пользователя. */
  busy: boolean;
  /** Общая ошибка редактора; null при её отсутствии. */
  error: ApiError | null;
  /** Доступные пространства. */
  spaces: SpaceData[];
  /** Открытое пространство; null, если ничего не выбрано. */
  space: SpaceData | null;
  /** Редактируемые ноды, связи и положение камеры. */
  graph: GraphData;
  /** Загруженные попытки генерации текущего пространства. */
  generations: GenerationData[];
  /** Последняя попытка генерации по идентификатору генератора. */
  byNode: Map<string, GenerationData>;
  /** Актуальные генерации по идентификатору ноды результата. */
  results: Map<string, GenerationData>;
  /** Идентификаторы генераторов, для которых отправляется запуск. */
  starting: Set<string>;
  /** Ошибки генерации или опроса по идентификатору генератора. */
  jobErrors: Map<string, ApiError>;
  /** Состояние очереди сохранения графа. */
  saved: SaveQueue['state'];
  /** Черновик, доступный для восстановления; null, если его нет. */
  draft: Draft | null;
  /** Ключ пересоздания React Flow при замене графа. */
  canvasKey: number;
  /** Есть ли изменение, которое можно отменить. */
  canUndo: boolean;
  /** Есть ли отменённое изменение, которое можно повторить. */
  canRedo: boolean;
};

/** Состояние интерфейса генератора от подготовки цепочки до результата. */
export type GenerationPhase =
  | 'incomplete'
  | 'ready'
  | 'starting'
  | 'uncertain'
  | 'processing'
  | 'poll_error'
  | 'failed'
  | 'succeeded';

/** Признаки, по которым определяется состояние генератора. */
export type GenerationContext = {
  /** Последняя известная попытка генерации. */
  job?: Pick<GenerationData, 'status'>;
  /** Отправляется ли запрос запуска. */
  starting: boolean;
  /** Осталась ли неподтверждённая попытка запуска. */
  pending: boolean;
  /** Готова ли цепочка нод к генерации. */
  ready: boolean;
  /** Есть ли ошибка запуска или проверки состояния. */
  error: boolean;
};

/** Индексы для проверки связей и быстрого поиска нод. */
export type GraphIndex = {
  /** Тип и позиция ноды в массиве по её идентификатору. */
  nodes: Map<string, IndexedNode>;
  /** Идентификатор источника по идентификатору входной ноды. */
  inputs: Map<string, string>;
  /** Идентификатор результата по идентификатору генератора. */
  outputs: Map<string, string>;
};

/** Положение и тип ноды в индексированном графе. */
export type IndexedNode = {
  /** Индекс ноды в массиве graph.nodes. */
  index: number;
  /** Тип блока, определяющий допустимые связи. */
  type: NodeData['type'];
};

/** Координаты ноды в системе координат холста. */
export type NodePosition = NodeData['position'];

/** Снимок содержимого графа для undo/redo без положения камеры. */
export type Snapshot = Pick<GraphData, 'nodes' | 'edges'>;

/** Состояние очереди сохранения графа. */
export type State = {
  /** Текущий этап сохранения, включая ошибку или конфликт версий. */
  status: 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';
  /** Ошибка сохранения; null при её отсутствии. */
  error: ApiError | null;
};

/** Операции хранения графа и локальной восстановительной копии. */
export type Persistence = {
  /** Записывает граф с проверкой переданного ETag и возвращает новую версию. */
  write: (graph: GraphData, etag: string) => Promise<Reply<GraphData>>;
  /** Читает актуальный граф и его версию с сервера. */
  read: () => Promise<Reply<GraphData>>;
  /** Сохраняет локальную копию графа вместе с исходной версией. */
  backup: (graph: GraphData, etag: string) => void;
  /** Удаляет локальную копию после успешного сохранения. */
  clean: () => void;
};

/** Положение камеры и масштаб холста. */
export type Viewport = {
  /** Горизонтальное смещение камеры в экранных пикселях. */
  x: number;
  /** Вертикальное смещение камеры в экранных пикселях. */
  y: number;
  /** Коэффициент масштаба; 1 соответствует 100%. */
  zoom: number;
};

/** Замер движения камеры для вычисления инерции. */
export type Sample = {
  /** Положение камеры в момент замера. */
  viewport: Viewport;
  /** Время замера в миллисекундах по часам анимации. */
  time: number;
};

/** Источник времени и планировщик кадров для анимации инерции. */
export type Clock = {
  /** Возвращает текущее время анимации в миллисекундах. */
  now: () => number;
  /** Планирует кадр и возвращает его идентификатор. */
  request: (callback: FrameRequestCallback) => number;
  /** Отменяет запланированный кадр по идентификатору. */
  cancel: (id: number) => void;
};
