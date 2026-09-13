import { Alert, Button } from './ui';
import type { CanvasStateProps } from './types';
import { workspaceText } from '../constants/workspace';
import { canvas } from '../model/canvas';
import { downloadJson } from '../lib/download';

/** Показывает ошибки сохранения и действия с локальным черновиком. */
export const WorkspaceNotices = ({ state }: CanvasStateProps) => {
  const download = () => {
    const graph =
      state.saved.status === 'conflict' ? state.graph : (state.draft?.graph ?? state.graph);

    downloadJson(graph, 'canvas-draft.json');
  };

  const handleReload = () => void canvas.reload();

  const handleRetrySave = () => void canvas.save();

  return (
    <>
      {state.saved.error && (
        <Alert
          tone="warning"
          role="alert"
          actions={
            <>
              <Button onClick={download}>{workspaceText.downloadDraft}</Button>
              {state.saved.status === 'conflict' ? (
                <Button disabled={state.busy || state.starting.size > 0} onClick={handleReload}>
                  {workspaceText.reloadGraph}
                </Button>
              ) : (
                <Button onClick={handleRetrySave}>{workspaceText.retrySave}</Button>
              )}
            </>
          }
        >
          <p>
            {state.saved.error.message}
            {workspaceText.draftDownloadHint}
          </p>
        </Alert>
      )}
      {state.draft && (
        <Alert
          tone="info"
          actions={
            <>
              <Button disabled={state.busy} onClick={canvas.restore}>
                {workspaceText.restoreDraft}
              </Button>
              <Button onClick={download}>{workspaceText.download}</Button>
            </>
          }
        >
          {workspaceText.draftAvailable}
        </Alert>
      )}
    </>
  );
};
