import classNames from 'classnames';
import type { ReactNode } from 'react';
import style from './FieldFrame.module.scss';

/** Общая подпись, подсказка и ошибка для элементов ввода. */
export type FieldFrameProps = {
  /** Идентификатор поля для связей с подписью и пояснениями. */
  id: string;
  /** Доступное название поля. */
  label: string;
  /** Ошибка проверки, если она есть. */
  error?: string;
  /** Постоянная подсказка под полем. */
  hint?: ReactNode;
  /** Элемент ввода. */
  children: ReactNode;
  /** Дополнительное оформление обрамления. */
  className?: string;
};

/** Объединяет оформление полей; нажатие на подпись не переводит фокус. */
export const FieldFrame = ({ id, label, error, hint, children, className }: FieldFrameProps) => {
  return (
    <div className={classNames(style.field, className)}>
      <span id={`${id}-label`}>{label}</span>
      {children}
      {hint && (
        <small id={`${id}-hint`} className={style.hint}>
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className={style.error} role="alert">
          {error}
        </small>
      )}
    </div>
  );
};
