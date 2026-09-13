import { commonText } from '../constants/common';
import { Alert, Button } from './ui';
import type { ApiError } from '../lib/http';
import { RequestId } from './RequestId';

/** Ошибка и доступное действие восстановления. */
export type ErrorNoticeProps = {
  /** Ошибка для отображения; null скрывает уведомление. */
  error: ApiError | null;
  /** Повторяет неудавшееся действие, если повтор доступен. */
  retry?: () => void;
};

/** Показывает ошибку запроса и повтор, скрывая штатную отмену операции. */
export const ErrorNotice = ({ error, retry }: ErrorNoticeProps) => {
  if (!error || error.code === 'ABORTED') return null;

  return (
    <Alert
      tone="error"
      title={commonText.actionFailed}
      actions={
        retry && (
          <Button variant="secondary" onClick={retry}>
            {commonText.retry}
          </Button>
        )
      }
    >
      <p>{error.message}</p>
      <RequestId value={error.requestId} />
    </Alert>
  );
};
