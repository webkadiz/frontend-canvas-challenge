import type { NodeData } from '@canvas/contracts';
import type { LucideIcon } from 'lucide-react';

/** Описание блока в палитре редактора. */
export type PaletteItem = {
  /** Тип ноды, создаваемой при выборе. */
  type: NodeData['type'];
  /** Компонент иконки блока. */
  icon: LucideIcon;
  /** Название блока в палитре. */
  title: string;
  /** Краткое пояснение назначения блока. */
  hint: string;
};
