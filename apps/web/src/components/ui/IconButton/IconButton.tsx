import { Button } from '../Button/Button';
import type { ButtonProps } from '../Button/Button';

/** Свойства кнопки-иконки с обязательным доступным названием. */
export type IconButtonProps = ButtonProps & {
  /** Название действия для пользователей скринридера. */
  'aria-label': string;
};

/** Кнопка без видимого текста с обязательным доступным названием. */
export const IconButton = (props: IconButtonProps) => {
  return <Button {...props} />;
};
