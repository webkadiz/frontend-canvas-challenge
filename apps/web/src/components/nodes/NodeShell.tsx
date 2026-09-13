import { IconButton } from '../ui';
import { Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import classNames from 'classnames';
import style from '../../App.module.scss';
import { nodeText } from '../../constants/nodes';
import { canvas } from '../../model/canvas';

/** Общий каркас и оформление блока на холсте. */
export type NodeShellProps = {
  /** Идентификатор ноды для действий с графом. */
  id: string;
  /** Заголовок блока. */
  title: string;
  /** Значок или обозначение типа блока в шапке. */
  number: ReactNode;
  /** Содержимое блока. */
  children: ReactNode;
  /** Ключ стилевого варианта блока. */
  kind: string;
  /** Выделен ли блок на холсте. */
  selected?: boolean;
};

/** Общий каркас ноды с заголовком, выделением и кнопкой удаления. */
export const NodeShell = ({ id, title, number, children, kind, selected }: NodeShellProps) => {
  const handleRemove = () => canvas.remove(new Set([id]));

  return (
    <div className={classNames(style.flowCard, style[kind], { [style.chosen]: selected })}>
      <header className={style.nodeHeader}>
        <span className={style.nodeKind}>{number}</span>
        <strong>{title}</strong>
        <IconButton
          className={classNames('nodrag', style.deleteNode)}
          aria-label={nodeText.deleteLabel(title, id)}
          onClick={handleRemove}
        >
          <Trash2 size={15} aria-hidden="true" />
        </IconButton>
      </header>
      {children}
    </div>
  );
};
