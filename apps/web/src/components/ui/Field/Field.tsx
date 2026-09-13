import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useFieldAttributes } from '../../../hooks/useFieldAttributes';
import { FieldFrame } from '../FieldFrame/FieldFrame';

/** Свойства текстового поля с подписью и ошибкой. */
export type FieldProps = ComponentPropsWithRef<'input'> & {
  /** Подпись поля для пользователя. */
  label: string;
  /** Ошибка проверки поля; отсутствие значения скрывает сообщение. */
  error?: string;
  /** Постоянная подсказка под полем. */
  hint?: ReactNode;
  /** Дополнительное оформление обрамления поля. */
  frameClassName?: string;
};

/** Связывает поле с подписью и ошибкой через доступные атрибуты. */
export const Field = ({ label, error, hint, frameClassName, ...props }: FieldProps) => {
  const attributes = useFieldAttributes({ ...props, error, hint });

  return (
    <FieldFrame
      id={attributes.id}
      label={label}
      error={error}
      hint={hint}
      className={frameClassName}
    >
      <input {...props} {...attributes} />
    </FieldFrame>
  );
};
