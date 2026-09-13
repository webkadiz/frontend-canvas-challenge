import { Button } from './ui';
import type { CanvasStateProps } from './types';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';
import { canvas } from '../model/canvas';
import { SaveStatus } from './SaveStatus';
import { SpaceTitleDialog } from './SpaceTitleDialog';

/** Название пространства, переименование и состояние сохранения графа. */
export const WorkspaceToolbar = ({ state }: CanvasStateProps) => {
  if (!state.space) return null;

  const renameSpace = async (title: string) => {
    await canvas.rename(title);

    return canvas.state.error?.message ?? null;
  };

  const handleSave = () => void canvas.save();

  return (
    <div className={style.workspaceToolbar}>
      <div>
        <div className={style.breadcrumb}>
          {workspaceText.breadcrumbSpaces}
          <span>{workspaceText.breadcrumbSeparator}</span>
          {workspaceText.breadcrumbCanvas}
        </div>
        <div className={style.workspaceTitle}>
          <h1>{state.space.title}</h1>
          <SpaceTitleDialog
            key={state.space.id}
            mode="rename"
            initialTitle={state.space.title}
            disabled={state.busy || state.starting.size > 0}
            onSubmit={renameSpace}
          />
        </div>
      </div>
      <div className={style.toolbarActions}>
        <SaveStatus status={state.saved.status} />
        <Button
          variant="secondary"
          disabled={
            state.busy || state.saved.status === 'saved' || state.saved.status === 'conflict'
          }
          onClick={handleSave}
        >
          {workspaceText.save}
        </Button>
      </div>
    </div>
  );
};
