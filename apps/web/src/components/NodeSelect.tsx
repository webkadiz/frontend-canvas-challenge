import type { ChangeEventHandler } from 'react';
import type { NodeData } from '@canvas/contracts';
import { NODE_TITLES } from '../constants/palette';
import { workspaceText } from '../constants/workspace';
import { SelectField } from './ui';

/** Параметры выбора ноды по идентификатору. */
export type NodeSelectProps = {
  /** Доступное название списка выбора. */
  label: string;
  /** Идентификатор выбранной ноды. */
  value: string;
  /** Ноды, доступные в списке. */
  nodes: readonly NodeData[];
  /** Передаёт идентификатор выбранной ноды. */
  onChange: (id: string) => void;
};

/** Формирует различимую подпись ноды для списка выбора. */
const nodeLabel = (node: NodeData) => {
  return `${NODE_TITLES[node.type]}${workspaceText.nodeSeparator}${node.id.slice(0, 4)}`;
};

/** Доступный список нод с явным пустым вариантом. */
export const NodeSelect = ({ label, value, nodes, onChange }: NodeSelectProps) => {
  const handleChange: ChangeEventHandler<HTMLSelectElement> = (event) =>
    onChange(event.target.value);

  return (
    <SelectField label={label} value={value} onChange={handleChange}>
      <option value="">{workspaceText.chooseNode}</option>
      {nodes.map((node) => (
        <option key={node.id} value={node.id}>
          {nodeLabel(node)}
        </option>
      ))}
    </SelectField>
  );
};
