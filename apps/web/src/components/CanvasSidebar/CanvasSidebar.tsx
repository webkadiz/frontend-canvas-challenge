import type { CanvasStateProps } from '../types';
import { canvas } from '../../model/canvas';
import { SpaceTitleDialog } from '../SpaceTitleDialog';
import { SpaceList } from './SpaceList';
import { SidebarNodeTools } from './SidebarNodeTools';
import { SidebarHelp } from './SidebarHelp';
import style from '../../App.module.scss';

/** Объединяет навигацию по пространствам и инструменты текущего холста. */
export const CanvasSidebar = ({ state }: CanvasStateProps) => {
  const spaceActionsDisabled = state.busy || state.starting.size > 0;

  const createSpace = async (title: string) => {
    await canvas.create(title);

    return canvas.state.error?.message ?? null;
  };

  return (
    <aside className={style.sidebar}>
      <SpaceList spaces={state.spaces} activeId={state.space?.id} disabled={spaceActionsDisabled} />
      <SpaceTitleDialog disabled={spaceActionsDisabled} onSubmit={createSpace} />
      {state.space && <SidebarNodeTools nodes={state.graph.nodes} busy={state.busy} />}
      <SidebarHelp />
    </aside>
  );
};
