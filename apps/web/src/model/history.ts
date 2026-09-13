import type { Snapshot } from './types';
import type { GraphData } from '@canvas/contracts';

// Модель заменяет массивы и изменённые объекты, поэтому история переиспользует остальные данные.
/** Сохраняет ссылки на неизменяемые ноды и связи без копирования всего графа. */
const snapshot = ({ nodes, edges }: GraphData): Snapshot => ({ nodes, edges });

/** Сравнивает содержимое графа без камеры, сериализации и глубокого копирования. */
function sameContent(before: Snapshot, after: Snapshot) {
  if (before.nodes === after.nodes && before.edges === after.edges) return true;

  if (before.nodes.length !== after.nodes.length || before.edges.length !== after.edges.length)
    return false;

  for (let i = 0; i < before.nodes.length; i++) {
    const a = before.nodes[i];
    const b = after.nodes[i];

    if (a === b) continue;

    if (
      a.id !== b.id ||
      a.type !== b.type ||
      a.position.x !== b.position.x ||
      a.position.y !== b.position.y
    )
      return false;

    if (a.type === 'prompt' && b.type === 'prompt') {
      if (a.data.text !== b.data.text) return false;
    } else if (a.type !== 'prompt' && b.type !== 'prompt' && a.data.label !== b.data.label) {
      return false;
    }
  }

  for (let i = 0; i < before.edges.length; i++) {
    const a = before.edges[i];
    const b = after.edges[i];

    if (a !== b && (a.id !== b.id || a.source !== b.source || a.target !== b.target)) return false;
  }

  return true;
}

/** Хранит до 50 действий с группировкой ввода и перетаскивания; камера не отменяется. */
export class GraphHistory {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  private group?: string;

  /** Показывает, есть ли сохранённое действие для отмены. */
  get canUndo() {
    return this.past.length > 0;
  }

  /** Показывает, есть ли отменённое действие для возврата. */
  get canRedo() {
    return this.future.length > 0;
  }

  /** Запоминает начало группы изменений и сбрасывает недоступную после новой правки ветку redo. */
  record(before: GraphData, after: GraphData, group?: string) {
    if (sameContent(before, after)) return;

    if (!group || group !== this.group) {
      this.past.push(snapshot(before));

      if (this.past.length > 50) this.past.shift();
    }

    this.group = group;
    this.future = [];
  }

  /** Отделяет следующий жест или ввод от предыдущего действия. */
  endGroup() {
    this.group = undefined;
  }

  /** Возвращает предыдущий снимок содержимого с текущей камерой. */
  undo(current: GraphData): GraphData | undefined {
    const previous = this.past.pop();

    if (!previous) return;

    this.future.push(snapshot(current));
    this.endGroup();

    return { ...current, ...previous };
  }

  /** Возвращает отменённый снимок содержимого с текущей камерой. */
  redo(current: GraphData): GraphData | undefined {
    const next = this.future.pop();

    if (!next) return;

    this.past.push(snapshot(current));
    this.endGroup();

    return { ...current, ...next };
  }

  /** Удаляет обе ветки истории при закрытии или смене пространства. */
  clear() {
    this.past = [];
    this.future = [];
    this.endGroup();
  }
}
