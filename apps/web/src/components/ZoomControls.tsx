import { IconButton, Button } from './ui';
import { Undo2, Redo2, Minus, Plus, Maximize } from 'lucide-react';
import { zoomText } from '../constants/zoom';
import style from './ZoomControls.module.scss';
import { Panel, useReactFlow, useStore, useViewport } from '@xyflow/react';
import { useEffect, useSyncExternalStore } from 'react';
import { canvas } from '../model/canvas';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { MOBILE_QUERY } from '../constants/mobile';

/** Доступность подгонки графа под размер экрана. */
export type ZoomControlsProps = {
  /** Есть ли ноды, которые можно поместить в видимую область. */
  hasNodes: boolean;
};

/** Панель undo/redo, масштаба и подгонки графа под видимую область. */
export const ZoomControls = ({ hasNodes }: ZoomControlsProps) => {
  const mobile = useMediaQuery(MOBILE_QUERY);

  const { canUndo, canRedo, busy, starting } = useSyncExternalStore(
    canvas.subscribe,
    canvas.getSnapshot,
  );

  const historyDisabled = busy || starting.size > 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey)
      )
        return;

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select, [role="textbox"]'))
      )
        return;

      const undo = event.code === 'KeyZ' && !event.shiftKey;

      const redo =
        (event.code === 'KeyZ' && event.shiftKey) || (event.code === 'KeyY' && !event.shiftKey);

      if (!undo && !redo) return;

      event.preventDefault();

      if (undo) canvas.undo();
      else canvas.redo();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const minZoom = useStore((state) => state.minZoom);
  const maxZoom = useStore((state) => state.maxZoom);

  const animation = () => ({
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
  });

  const handleZoomOut = () => void zoomOut(animation());

  const handleResetZoom = () => void zoomTo(1, animation());

  const handleZoomIn = () => void zoomIn(animation());

  const handleFitView = () => void fitView({ padding: 0.2, maxZoom: 1, ...animation() });

  return (
    <Panel
      position={mobile ? 'bottom-center' : 'top-right'}
      className={style.zoomControls}
      role="group"
      aria-label={zoomText.group}
    >
      <IconButton
        type="button"
        aria-label={zoomText.undo}
        title={zoomText.undoShortcut}
        disabled={historyDisabled || !canUndo}
        onClick={canvas.undo}
      >
        <Undo2 size={20} aria-hidden="true" />
      </IconButton>
      <IconButton
        type="button"
        aria-label={zoomText.redo}
        title={zoomText.redoShortcut}
        disabled={historyDisabled || !canRedo}
        onClick={canvas.redo}
      >
        <Redo2 size={20} aria-hidden="true" />
      </IconButton>
      <span className={style.zoomDivider} aria-hidden="true" />
      <IconButton
        type="button"
        aria-label={zoomText.zoomOut}
        title={zoomText.zoomOut}
        disabled={zoom <= minZoom + 0.001}
        onClick={handleZoomOut}
      >
        <Minus size={20} aria-hidden="true" />
      </IconButton>
      <Button
        type="button"
        className={style.zoomPercent}
        aria-label={zoomText.resetLabel(Math.round(zoom * 100))}
        title={zoomText.resetTitle}
        onClick={handleResetZoom}
      >
        {Math.round(zoom * 100)}
        {zoomText.percent}
      </Button>
      <IconButton
        type="button"
        aria-label={zoomText.zoomIn}
        title={zoomText.zoomIn}
        disabled={zoom >= maxZoom - 0.001}
        onClick={handleZoomIn}
      >
        <Plus size={20} aria-hidden="true" />
      </IconButton>
      <span className={style.zoomDivider} aria-hidden="true" />
      <IconButton
        type="button"
        aria-label={zoomText.fit}
        title={zoomText.fit}
        disabled={!hasNodes}
        onClick={handleFitView}
      >
        <Maximize size={18} aria-hidden="true" />
      </IconButton>
    </Panel>
  );
};
