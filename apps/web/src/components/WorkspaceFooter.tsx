import type { CanvasStateProps } from './types';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';
import { mobileText } from '../constants/mobile';

/** Показывает лимиты графа и подсказки по работе с канвасом. */
export const WorkspaceFooter = ({ state }: CanvasStateProps) => {
  return (
    <div className={style.workspaceFooter}>
      <span>
        {state.graph.nodes.length}
        {workspaceText.nodeCountSuffix}
        <i>{workspaceText.separator}</i> {state.graph.edges.length}
        {workspaceText.edgeCountSuffix}
      </span>
      <span>
        {workspaceText.connectionHint}
        <i>{workspaceText.separator}</i>
        {workspaceText.deleteHint}
      </span>
      <span className={style.touchHint}>{mobileText.touchHint}</span>
      <span>{workspaceText.attribution}</span>
    </div>
  );
};
