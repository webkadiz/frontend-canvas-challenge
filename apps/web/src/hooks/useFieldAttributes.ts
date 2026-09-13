import { useId } from 'react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Атрибуты доступности поля и его пояснения. */
export type FieldAttributesOptions = Pick<
  ComponentPropsWithRef<'input'>,
  'id' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid'
> & {
  /** Сообщение об ошибке для связи с полем. */
  error?: string;
  /** Подсказка, которая будет объявляться вместе с полем. */
  hint?: ReactNode;
};

/** Связывает поле с подписью, подсказкой и ошибкой, сохраняя внешние описания. */
export const useFieldAttributes = (options: FieldAttributesOptions) => {
  const generatedId = useId();
  const id = options.id ?? generatedId;

  return {
    id,
    'aria-labelledby': [`${id}-label`, options['aria-labelledby']].filter(Boolean).join(' '),
    'aria-describedby':
      [options['aria-describedby'], options.hint && `${id}-hint`, options.error && `${id}-error`]
        .filter(Boolean)
        .join(' ') || undefined,
    'aria-invalid': options.error ? true : (options['aria-invalid'] ?? false),
  };
};
