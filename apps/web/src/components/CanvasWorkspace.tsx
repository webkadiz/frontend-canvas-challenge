import type { CanvasStateProps } from './types';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';
import { canvas } from '../model/canvas';
import { CanvasView } from './CanvasView';
import { ErrorNotice } from './ErrorNotice';
import { Empty, Button } from './ui';
import { CanvasWelcome } from './CanvasWelcome';
import { WorkspaceToolbar } from './WorkspaceToolbar';
import { WorkspaceNotices } from './WorkspaceNotices';
import { WorkspaceFooter } from './WorkspaceFooter';

/** Объединяет редактор, состояния сохранения и действия восстановления. */
export const CanvasWorkspace = ({ state }: CanvasStateProps) => {
  const handleCreateSpace = () => void canvas.create(workspaceText.defaultTitle);

  return (
    <main className={style.workspace}>
      {state.space && <WorkspaceToolbar state={state} />}
      <ErrorNotice error={state.error} retry={canvas.retry} />
      {state.space ? (
        <>
          <WorkspaceNotices state={state} />
          <section className={style.canvasSurface} inert={state.busy}>
            <CanvasView key={`${state.space.id}-${state.canvasKey}`} graph={state.graph} />
            {!state.graph.nodes.length && <CanvasWelcome />}
          </section>
          <WorkspaceFooter state={state} />
        </>
      ) : (
        <Empty title={state.ready ? workspaceText.emptyTitle : workspaceText.loadingTitle}>
          <p>{workspaceText.emptyHint}</p>
          {state.ready && (
            <Button variant="primary" onClick={handleCreateSpace}>
              {workspaceText.createFirst}
            </Button>
          )}
        </Empty>
      )}
    </main>
  );
};
