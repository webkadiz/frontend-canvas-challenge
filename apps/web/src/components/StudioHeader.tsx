import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';

/** Дополнительные элементы шапки редактора. */
type StudioHeaderProps = {
  /** Элемент открытия навигации, например мобильной панели. */
  navigation?: ReactNode;
};

/** Шапка редактора с мобильной навигацией, названием и отметкой демо-режима. */
export const StudioHeader = ({ navigation }: StudioHeaderProps) => {
  return (
    <header className={style.studioHeader}>
      {navigation}
      <div className={style.studioBrand}>
        <span className={style.brandIcon}>
          <Sparkles size={24} aria-hidden="true" />
        </span>
        {workspaceText.brand}
        <span className={style.beta}>{workspaceText.beta}</span>
      </div>
      <span className={style.headerDivider} />
      <span className={style.workspaceLabel}>{workspaceText.workspace}</span>
      <div className={style.headerRight}>
        <span className={style.demoPill}>{workspaceText.demo}</span>
        <span className={style.avatar}>{workspaceText.avatar}</span>
      </div>
    </header>
  );
};
