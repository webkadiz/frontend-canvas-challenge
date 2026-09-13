import type { SpaceData } from '@canvas/contracts';
import { PanelsTopLeft } from 'lucide-react';
import classNames from 'classnames';
import { Button } from '../ui';
import { canvas } from '../../model/canvas';
import style from '../../App.module.scss';

/** Данные кнопки выбора пространства. */
type SpaceListItemProps = {
  /** Пространство, которое откроется при нажатии. */
  space: SpaceData;
  /** Открыто ли это пространство сейчас. */
  active: boolean;
  /** Запрещено ли открытие пространства. */
  disabled: boolean;
};

/** Кнопка пространства с выделением текущего выбора. */
export const SpaceListItem = ({ space, active, disabled }: SpaceListItemProps) => {
  const handleOpen = () => void canvas.open(space);

  return (
    <Button
      disabled={disabled}
      className={classNames(style.spaceButton, { [style.active]: active })}
      onClick={handleOpen}
    >
      <span>
        <PanelsTopLeft size={17} aria-hidden="true" />
      </span>
      {space.title}
    </Button>
  );
};
