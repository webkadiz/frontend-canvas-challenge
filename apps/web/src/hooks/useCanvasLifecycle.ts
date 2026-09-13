import { useEffect } from 'react';
import { canvas } from '../model/canvas';

/** Восстанавливает пространство и сохраняет черновик перед остановкой модели. */
export function useCanvasLifecycle() {
  useEffect(() => {
    void canvas.boot();

    const leave = () => {
      canvas.backup();
      canvas.close();
    };

    const unload = (event: BeforeUnloadEvent) => {
      if (canvas.state.saved.status !== 'saved' || canvas.state.starting.size) {
        canvas.backup();
        event.preventDefault();
      }
    };

    window.addEventListener('pagehide', leave);

    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) void canvas.boot();
    };

    window.addEventListener('pageshow', resume);
    window.addEventListener('beforeunload', unload);

    return () => {
      leave();
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);
}
