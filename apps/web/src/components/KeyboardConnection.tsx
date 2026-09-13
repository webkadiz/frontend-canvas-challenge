import { Button } from './ui';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { canvas } from '../model/canvas';
import { NodeSelect } from './NodeSelect';
import type { GraphData } from '@canvas/contracts';

/** Данные формы соединения блоков с клавиатуры. */
export type KeyboardConnectionProps = {
  /** Ноды, из которых выбираются источник и получатель. */
  nodes: GraphData['nodes'];
  /** Запрещено ли создание связи. */
  disabled: boolean;
};

/** Позволяет соединять совместимые ноды без перетаскивания мышью. */
export const KeyboardConnection = ({ nodes, disabled }: KeyboardConnectionProps) => {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const sources = nodes.filter((node) => node.type !== 'result');
  const targets = nodes.filter((node) => node.type !== 'prompt');

  const connect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const connected = canvas.connect(source, target);

    setMessage(connected ? workspaceText.connectionAdded : workspaceText.invalidConnection);
  };

  return (
    <details className={style.keyboardConnect} inert={disabled}>
      <summary>{workspaceText.keyboardConnect}</summary>
      <form onSubmit={connect}>
        <NodeSelect
          label={workspaceText.source}
          value={source}
          nodes={sources}
          onChange={setSource}
        />
        <NodeSelect
          label={workspaceText.target}
          value={target}
          nodes={targets}
          onChange={setTarget}
        />
        <Button type="submit" variant="secondary" fullWidth disabled={!source || !target}>
          {workspaceText.connect}
        </Button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
};
