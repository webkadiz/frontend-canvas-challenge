import { Info } from 'lucide-react';
import { workspaceText } from '../../constants/workspace';
import style from '../../App.module.scss';

/** Краткая подсказка по работе с холстом внизу боковой панели. */
export const SidebarHelp = () => {
  return (
    <div className={style.sidebarBottom}>
      <span className={style.helpIcon}>
        <Info size={15} aria-hidden="true" />
      </span>
      <p>
        {workspaceText.helpStart}
        <br />
        {workspaceText.helpEnd}
      </p>
    </div>
  );
};
