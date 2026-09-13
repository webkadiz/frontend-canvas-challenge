export const zoomText = {
  group: 'История и масштаб канваса',
  undo: 'Отменить изменение',
  undoShortcut: 'Отменить (Ctrl/Cmd+Z)',
  redo: 'Повторить изменение',
  redoShortcut: 'Повторить (Ctrl/Cmd+Shift+Z)',
  zoomOut: 'Уменьшить масштаб',
  resetLabel: (percent: number) => `Масштаб ${percent}%. Сбросить до 100%`,
  resetTitle: 'Сбросить масштаб до 100%',
  percent: '%',
  zoomIn: 'Увеличить масштаб',
  fit: 'Показать всю схему',
} as const;
