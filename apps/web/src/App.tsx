import { useSyncExternalStore } from 'react';
import style from './App.module.scss';
import { canvas } from './model/canvas';
import { useCanvasLifecycle } from './hooks/useCanvasLifecycle';
import { StudioHeader } from './components/StudioHeader';
import { CanvasSidebar } from './components/CanvasSidebar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { MobileSidebar } from './components/MobileSidebar';
import { useMediaQuery } from './hooks/useMediaQuery';
import { MOBILE_QUERY } from './constants/mobile';

/** Собирает каркас редактора и подключает состояние и жизненный цикл пространства. */
export const App = () => {
  const state = useSyncExternalStore(canvas.subscribe, canvas.getSnapshot);
  const mobile = useMediaQuery(MOBILE_QUERY);

  useCanvasLifecycle();

  return (
    <div className={style.studio}>
      <StudioHeader navigation={mobile ? <MobileSidebar state={state} /> : undefined} />
      {!mobile && <CanvasSidebar state={state} />}
      <CanvasWorkspace state={state} />
    </div>
  );
};
