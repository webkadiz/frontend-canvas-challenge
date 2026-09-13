import { commonText } from '../../constants/common';

/** Идентификатор запроса для диагностики ошибки. */
type RequestIdProps = {
  /** Идентификатор из ответа сервера; отсутствие значения скрывает компонент. */
  value?: string;
};

/** Показывает идентификатор запроса для диагностики ошибки, если он доступен. */
export const RequestId = ({ value }: RequestIdProps) => {
  if (!value) return null;

  return (
    <small>
      {commonText.requestId}
      {value}
    </small>
  );
};
