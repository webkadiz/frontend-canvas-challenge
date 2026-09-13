import type { GraphData } from '@canvas/contracts';
import classNames from 'classnames';
import { workspaceText } from '../../constants/workspace';
import { NodePalette } from '../NodePalette';
import { KeyboardConnection } from '../KeyboardConnection';
import style from '../../App.module.scss';

/** Данные инструментов добавления и соединения блоков. */
type SidebarNodeToolsProps = {
  /** Ноды текущего графа, доступные для соединения. */
  nodes: GraphData['nodes'];
  /** Заблокированы ли действия с графом. */
  busy: boolean;
};

/** Палитра блоков и доступное с клавиатуры создание связей. */
export const SidebarNodeTools = ({ nodes, busy }: SidebarNodeToolsProps) => {
  return (
    <>
      <div className={classNames(style.sidebarHeading, style.nodeSection)}>
        {workspaceText.blocks}
      </div>
      <p className={style.sidebarHint}>
        {workspaceText.paletteHintStart}
        <br />
        {workspaceText.paletteHintEnd}
      </p>
      <NodePalette disabled={nodes.length >= 20 || busy} />
      <KeyboardConnection nodes={nodes} disabled={busy} />
    </>
  );
};
