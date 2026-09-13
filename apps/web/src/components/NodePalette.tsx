import { Button } from './ui';
import { Plus } from 'lucide-react';
import style from '../App.module.scss';
import classNames from 'classnames';
import { NODE_PALETTE } from '../constants/palette';
import { canvas } from '../model/canvas';

/** Состояние палитры доступных блоков. */
export type NodePaletteProps = {
  /** Запрещено ли добавление новых блоков. */
  disabled: boolean;
};

/** Предлагает доступные типы нод для добавления в граф. */
export const NodePalette = ({ disabled }: NodePaletteProps) => {
  const createAddNodeHandler = (nodeType: Parameters<typeof canvas.add>[0]) => () =>
    canvas.add(nodeType);

  return (
    <div className={style.nodePalette}>
      {NODE_PALETTE.map(({ type, icon: Icon, title, hint }) => (
        <Button
          key={type}
          className={classNames(style.paletteItem, style[type])}
          disabled={disabled}
          onClick={createAddNodeHandler(type)}
        >
          <span>
            <Icon size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{title}</strong>
            <small>{hint}</small>
          </div>
          <b>
            <Plus size={16} aria-hidden="true" />
          </b>
        </Button>
      ))}
    </div>
  );
};
