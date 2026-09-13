import { Type } from 'lucide-react';
import type { ChangeEventHandler } from 'react';
import classNames from 'classnames';
import style from '../../App.module.scss';
import { nodeText } from '../../constants/nodes';
import { canvas } from '../../model/canvas';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NodeShell } from './NodeShell';
import type { FlowNode } from './types';

/** Редактирует текст промпта и предоставляет выход для генератора. */
export const PromptNode = memo(({ id, data, selected }: NodeProps<FlowNode>) => {
  const inputId = `prompt-${id}`;

  const handleTextChange: ChangeEventHandler<HTMLTextAreaElement> = (e) =>
    canvas.editText(id, e.target.value);

  return (
    <NodeShell
      id={id}
      title={nodeText.prompt}
      number={<Type size={16} aria-hidden="true" />}
      kind="promptNode"
      selected={selected}
    >
      <div className={style.nodeBody}>
        <label className={style.promptLabel} htmlFor={inputId}>
          {nodeText.promptLabel}
        </label>
        <textarea
          id={inputId}
          className={classNames('nodrag', 'nowheel')}
          value={data.text ?? ''}
          maxLength={2000}
          placeholder={nodeText.promptPlaceholder}
          onChange={handleTextChange}
          onFocus={canvas.endHistoryGroup}
          onBlur={canvas.endHistoryGroup}
        />
        <div className={style.nodeMeta}>
          <span>
            {data.text?.length ?? 0}
            {nodeText.textLimit}
          </span>
          <span>{nodeText.promptOutputLabel}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} aria-label={nodeText.promptOutput} />
    </NodeShell>
  );
});

PromptNode.displayName = 'PromptNode';
