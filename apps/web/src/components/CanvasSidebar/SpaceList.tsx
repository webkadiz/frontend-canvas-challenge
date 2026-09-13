import type { SpaceData } from '@canvas/contracts';
import { workspaceText } from '../../constants/workspace';
import { SpaceListItem } from './SpaceListItem';
import style from '../../App.module.scss';

/** Данные списка пространств и текущего выбора. */
type SpaceListProps = {
  /** Пространства для отображения. */
  spaces: SpaceData[];
  /** Идентификатор открытого пространства. */
  activeId?: string;
  /** Запрещено ли переключение между пространствами. */
  disabled: boolean;
};

/** Список пространств со счётчиком и выбором активного холста. */
export const SpaceList = ({ spaces, activeId, disabled }: SpaceListProps) => {
  return (
    <>
      <div className={style.sidebarHeading}>
        {workspaceText.spaces}
        <span>{spaces.length}</span>
      </div>
      <div className={style.spaceList}>
        {spaces.map((space) => (
          <SpaceListItem
            key={space.id}
            space={space}
            active={space.id === activeId}
            disabled={disabled}
          />
        ))}
      </div>
    </>
  );
};
