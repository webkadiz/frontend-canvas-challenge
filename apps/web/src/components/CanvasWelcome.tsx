import { Button } from './ui';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import style from '../App.module.scss';
import { workspaceText } from '../constants/workspace';
import { canvas } from '../model/canvas';

/** Пустой канвас с предложением добавить готовую цепочку. */
export const CanvasWelcome = () => {
  return (
    <div className={style.canvasWelcome}>
      <div className={style.welcomeSymbol}>
        <Sparkles size="1em" aria-hidden="true" />
      </div>
      <p className={style.eyebrow}>{workspaceText.welcomeEyebrow}</p>
      <h2>{workspaceText.welcomeTitle}</h2>
      <p>
        {workspaceText.welcomeStart}
        <br />
        {workspaceText.welcomeEnd}
      </p>
      <Button variant="primary" className={style.starterButton} onClick={canvas.starter}>
        {workspaceText.addExample} <ArrowUpRight size={16} aria-hidden="true" />
      </Button>
    </div>
  );
};
