import { ArrowUpRight } from 'lucide-react';
import style from './Empty.module.scss';
import type { ReactNode } from 'react';

/** Содержимое сообщения о пустом состоянии. */
export type EmptyProps = {
  /** Заголовок пустого состояния. */
  title: string;
  /** Дополнительное пояснение или действие. */
  children?: ReactNode;
};

/** Единое оформление пустого состояния с пояснением и дополнительным действием. */
export const Empty = ({ title, children }: EmptyProps) => {
  return (
    <div className={style.empty}>
      <span className={style.emptySymbol} aria-hidden="true">
        <ArrowUpRight size="1em" aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
};
