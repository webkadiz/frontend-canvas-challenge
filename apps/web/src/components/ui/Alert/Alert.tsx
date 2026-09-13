import classNames from 'classnames';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import style from './Alert.module.scss';

/** Свойства уведомления с содержимым и необязательными действиями. */
export type AlertProps = ComponentPropsWithRef<'div'> & {
  /** Визуальная важность сообщения; ошибка объявляется немедленно. */
  tone?: 'error' | 'warning' | 'info';
  /** Заголовок уведомления, если он нужен. */
  title?: string;
  /** Кнопки или ссылки для действий с уведомлением. */
  actions?: ReactNode;
};

/** Общий каркас уведомления без привязки к API и прикладным действиям. */
export const Alert = ({
  tone = 'info',
  title,
  actions,
  children,
  className,
  role = tone === 'error' ? 'alert' : 'status',
  ...props
}: AlertProps) => {
  return (
    <div {...props} className={classNames(style.alert, style[tone], className)} role={role}>
      <div className={style.content}>
        {title && <strong>{title}</strong>}
        {children}
      </div>
      {actions && <div className={style.actions}>{actions}</div>}
    </div>
  );
};
