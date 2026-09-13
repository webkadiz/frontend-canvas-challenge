import { Button } from '../ui';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import type { ChangeEventHandler } from 'react';
import classNames from 'classnames';
import style from '../../App.module.scss';
import { nodeText } from '../../constants/nodes';
import { canvas } from '../../model/canvas';
import { memo, useState, useSyncExternalStore } from 'react';
import { generationLabel } from '../../constants/generation';
import { generationPhase, generationRunning } from '../../model/generation-state';
import { generationHint } from './presentation';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NodeShell } from './NodeShell';
import type { FlowNode } from './types';

/** Запускает тестовую генерацию и показывает её состояние и доступные повторы. */
export const GeneratorNode = memo(({ id, selected }: NodeProps<FlowNode>) => {
  const job = useSyncExternalStore(canvas.subscribe, () => canvas.state.byNode.get(id));
  const error = useSyncExternalStore(canvas.subscribe, () => canvas.state.jobErrors.get(id));
  const starting = useSyncExternalStore(canvas.subscribe, () => canvas.state.starting.has(id));
  const anyStarting = useSyncExternalStore(canvas.subscribe, () => canvas.state.starting.size > 0);
  const ready = useSyncExternalStore(canvas.subscribe, () => canvas.readyToGenerate(id));
  const [failure, setFailure] = useState(false);
  const pending = canvas.hasPending(id);
  const phase = generationPhase({ job, starting, pending, ready, error: !!error });
  const processing = generationRunning(phase);

  const handleFailureChange: ChangeEventHandler<HTMLInputElement> = (e) =>
    setFailure(e.target.checked);

  const handleGenerate = () => canvas.generate(id, failure ? 'failure' : 'success');

  const handleResume = () => canvas.resume(id);

  return (
    <NodeShell
      id={id}
      title={nodeText.generator}
      number={<Sparkles size={16} aria-hidden="true" />}
      kind="generatorNode"
      selected={selected}
    >
      <Handle type="target" position={Position.Left} aria-label={nodeText.generatorInput} />
      <div className={style.nodeBody}>
        <div className={style.engine}>
          <span aria-hidden="true">
            <Sparkles size={24} aria-hidden="true" />
          </span>
          <div>
            <strong>{nodeText.demoTitle}</strong>
            <small>{nodeText.demoDescription}</small>
          </div>
        </div>
        <label className={classNames(style.failureToggle, 'nodrag')}>
          <input
            type="checkbox"
            checked={failure}
            disabled={starting || processing || pending}
            onChange={handleFailureChange}
          />
          {nodeText.simulateFailure}
        </label>
        <Button
          variant="primary"
          fullWidth
          className={classNames(style.generateButton, 'nodrag')}
          disabled={anyStarting || processing || (!ready && !pending)}
          onClick={handleGenerate}
        >
          {generationLabel[phase]} <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
        <p className={style.nodeHint} role="status">
          {generationHint(phase, ready)}
        </p>
        {error && (
          <div className={style.nodeError} role="alert">
            {error.message}
            {phase === 'poll_error' && (
              <Button variant="text" className={'nodrag'} onClick={handleResume}>
                {nodeText.resume}
              </Button>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} aria-label={nodeText.generatorOutput} />
    </NodeShell>
  );
});

GeneratorNode.displayName = 'GeneratorNode';
