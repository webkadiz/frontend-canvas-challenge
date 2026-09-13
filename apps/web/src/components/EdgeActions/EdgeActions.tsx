import { Panel } from '@xyflow/react';
import { Trash2 } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { canvasViewText } from '../../constants/nodes';
import { canvas } from '../../model/canvas';
import { Button } from '../ui';
import style from './EdgeActions.module.scss';

/** Параметры панели удаления выбранных связей. */
type EdgeActionsProps = {
  /** Количество выбранных связей. */
  count: number;
  /** Удаляет выбранные связи без удаления блоков. */
  onDelete: () => void;
};

/** Показывает доступное мышью, с клавиатуры и на телефоне удаление выбранных связей. */
export const EdgeActions = ({ count, onDelete }: EdgeActionsProps) => {
  const { busy, starting } = useSyncExternalStore(canvas.subscribe, canvas.getSnapshot);

  if (!count) return null;

  return (
    <Panel position="top-left" className={style.panel}>
      <div role="group" aria-label={canvasViewText.edgeActions}>
        <Button
          variant="secondary"
          className={style.deleteButton}
          disabled={busy || starting.size > 0}
          onClick={onDelete}
        >
          <Trash2 size={18} aria-hidden="true" />
          {count === 1 ? canvasViewText.deleteEdge : canvasViewText.deleteEdges}
        </Button>
      </div>
    </Panel>
  );
};
