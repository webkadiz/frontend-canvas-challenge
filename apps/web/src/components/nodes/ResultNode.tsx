import { Image } from 'lucide-react';
import classNames from 'classnames';
import style from '../../App.module.scss';
import { nodeText } from '../../constants/nodes';
import { canvas } from '../../model/canvas';
import { memo, useSyncExternalStore } from 'react';
import { imageUrl } from '../../api';
import { RESULT_PRESENTATION } from '../../constants/nodes';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { NodeShell } from './NodeShell';
import type { FlowNode } from './types';

/** Показывает изображение только от актуальной генерации, связанной с этой нодой. */
export const ResultNode = memo(({ id, selected }: NodeProps<FlowNode>) => {
  const job = useSyncExternalStore(canvas.subscribe, () => canvas.state.results.get(id));
  const presentation = RESULT_PRESENTATION[job?.status ?? 'idle'];
  const StatusIcon = presentation.icon;

  return (
    <NodeShell
      id={id}
      title={nodeText.result}
      number={<Image size={16} aria-hidden="true" />}
      kind="resultNode"
      selected={selected}
    >
      <Handle type="target" position={Position.Left} aria-label={nodeText.resultInput} />
      <div className={style.resultPreview}>
        {job?.status === 'succeeded' && job.imageUrl ? (
          <img src={imageUrl(job.imageUrl)} alt={job.prompt} />
        ) : (
          <div className={style.imagePlaceholder}>
            <span aria-hidden="true">
              <StatusIcon size={29} aria-hidden="true" />
            </span>
            <strong>{presentation.title}</strong>
            <small>{presentation.hint}</small>
          </div>
        )}
      </div>
      <div className={style.resultFooter}>
        <span className={classNames(style.statusDot, job && style[job.status])} />
        {presentation.status}
        <span>{nodeText.demo}</span>
      </div>
    </NodeShell>
  );
});

ResultNode.displayName = 'ResultNode';
