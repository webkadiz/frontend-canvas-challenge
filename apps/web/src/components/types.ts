import type { CanvasState } from '../model/types';

/** Общее состояние редактора для составных компонентов. */
export type CanvasStateProps = {
  /** Актуальный снимок модели канваса. */
  state: CanvasState;
};
