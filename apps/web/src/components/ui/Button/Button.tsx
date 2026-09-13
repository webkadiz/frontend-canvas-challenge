import classNames from 'classnames';
import style from './Button.module.scss';
import type { ComponentPropsWithRef, MouseEventHandler } from 'react';

/** Доступные варианты оформления общей кнопки. */
export type ButtonVariant = 'unstyled' | 'primary' | 'secondary' | 'text';

/** Стандартные свойства кнопки с настройками оформления. */
export type ButtonProps = ComponentPropsWithRef<'button'> & {
  /** Вариант оформления; по умолчанию без дополнительных стилей. */
  variant?: ButtonVariant;
  /** Растягивать ли кнопку на всю ширину контейнера. */
  fullWidth?: boolean;
};

/** Общая кнопка: оформление, безопасный тип и блокировка действия без потери фокуса. */
export const Button = ({
  variant = 'unstyled',
  fullWidth = false,
  type = 'button',
  className,
  onClick,
  ...props
}: ButtonProps) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    if (props.disabled || props['aria-disabled'] === true || props['aria-disabled'] === 'true') {
      event.preventDefault();
      return;
    }

    onClick?.(event);
  };

  return (
    <button
      {...props}
      type={type}
      className={classNames(
        variant !== 'unstyled' && style[variant],
        { [style.fullWidth]: fullWidth },
        className,
      )}
      onClick={handleClick}
    />
  );
};
