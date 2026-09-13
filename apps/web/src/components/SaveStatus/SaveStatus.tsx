import classNames from 'classnames';
import type { CanvasState } from '../../model/types';
import { saveLabels } from '../../constants/workspace';
import style from '../../App.module.scss';

/** Состояние индикатора сохранения графа. */
type SaveStatusProps = {
  /** Текущий этап работы очереди сохранения. */
  status: CanvasState['saved']['status'];
};

/** Индикатор сохранения с доступным уведомлением об изменении статуса. */
export const SaveStatus = ({ status }: SaveStatusProps) => {
  return (
    <span className={classNames(style.saveState, style[status])} role="status">
      <i />
      {saveLabels[status]}
    </span>
  );
};
