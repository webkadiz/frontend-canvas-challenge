import type { ComponentPropsWithRef, ReactNode } from 'react';
import { useFieldAttributes } from '../../../hooks/useFieldAttributes';
import { FieldFrame } from '../FieldFrame/FieldFrame';

/** Свойства списка выбора с общими подписями и ошибками. */
export type SelectFieldProps = ComponentPropsWithRef<'select'> & {
  /** Название поля для пользователя. */
  label: string;
  /** Ошибка проверки выбранного значения. */
  error?: string;
  /** Пояснение под списком выбора. */
  hint?: ReactNode;
};

/** Список выбора с теми же правилами доступности, что у текстового поля. */
export const SelectField = ({ label, error, hint, ...props }: SelectFieldProps) => {
  const attributes = useFieldAttributes({ ...props, error, hint });

  return (
    <FieldFrame id={attributes.id} label={label} error={error} hint={hint}>
      <select {...props} {...attributes} />
    </FieldFrame>
  );
};
