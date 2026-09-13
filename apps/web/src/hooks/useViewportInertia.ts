import { useCallback, useEffect, useRef, useState } from 'react';
import type { OnMove, ReactFlowInstance } from '@xyflow/react';
import { ViewportInertia } from '../model/viewport-inertia';

/** Связывает жесты камеры с инерцией, учитывая миникарту и сокращение анимаций. */
export const useViewportInertia = () => {
  const flow = useRef<Pick<ReactFlowInstance, 'setViewport'> | null>(null);
  const reducedMotion = useRef(false);

  const [inertia] = useState(
    () =>
      new ViewportInertia(
        (viewport) => {
          void flow.current?.setViewport(viewport, { duration: 0 });
        },
        {
          now: () => performance.now(),
          request: (tick) => requestAnimationFrame(tick),
          cancel: (id) => cancelAnimationFrame(id),
        },
      ),
  );

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      reducedMotion.current = preference.matches;

      if (preference.matches) inertia.cancel();
    };

    updatePreference();
    preference.addEventListener('change', updatePreference);
    // Отменяем инерцию до обработки нового жеста React Flow, включая перетаскивание нод и миникарты.
    window.addEventListener('pointerdown', inertia.cancel, true);
    window.addEventListener('wheel', inertia.cancel, { capture: true, passive: true });
    window.addEventListener('keydown', inertia.cancel, true);
    window.addEventListener('blur', inertia.cancel);
    document.addEventListener('visibilitychange', inertia.cancel);

    return () => {
      inertia.cancel();
      preference.removeEventListener('change', updatePreference);
      window.removeEventListener('pointerdown', inertia.cancel, true);
      window.removeEventListener('wheel', inertia.cancel, true);
      window.removeEventListener('keydown', inertia.cancel, true);
      window.removeEventListener('blur', inertia.cancel);
      document.removeEventListener('visibilitychange', inertia.cancel);
    };
  }, [inertia]);

  const onInit = useCallback((instance: Pick<ReactFlowInstance, 'setViewport'>) => {
    flow.current = instance;
  }, []);

  const onMoveStart: OnMove = useCallback(
    (event, viewport) => {
      // Не добавляем инерцию программному движению, масштабированию колёсиком и сенсорным жестам.
      if (!event) return;

      inertia.cancel();

      if (
        reducedMotion.current ||
        event.type !== 'mousedown' ||
        !('button' in event) ||
        event.button !== 0
      )
        return;

      const target = event.target;

      if (
        !(target instanceof Element) ||
        !target.closest('.react-flow__pane') ||
        target.closest(
          '.react-flow__node, .react-flow__edge, .react-flow__panel, .react-flow__minimap',
        )
      )
        return;

      inertia.start(viewport);
    },
    [inertia],
  );

  const onMove: OnMove = useCallback(
    (event, viewport) => {
      if (event?.type === 'mousemove') inertia.move(viewport);
    },
    [inertia],
  );

  const onMoveEnd: OnMove = useCallback(
    (event, viewport) => {
      if (event?.type === 'mouseup' && !reducedMotion.current) inertia.release(viewport);
    },
    [inertia],
  );

  return { onInit, onMoveStart, onMove, onMoveEnd };
};
