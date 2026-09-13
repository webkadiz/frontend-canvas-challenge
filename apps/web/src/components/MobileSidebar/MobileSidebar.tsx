import { Menu, X, ArrowRight } from 'lucide-react';
import classNames from 'classnames';
import { createPortal } from 'react-dom';
import type { CanvasStateProps } from '../types';
import { Button, IconButton } from '../ui';
import { CanvasSidebar } from '../CanvasSidebar';
import { mobileText } from '../../constants/mobile';
import { useMobileSidebar } from '../../hooks/useMobileSidebar';
import style from './MobileSidebar.module.scss';

/** Мобильная навигация в модальном диалоге, не занимающая место на холсте. */
export const MobileSidebar = ({ state }: CanvasStateProps) => {
  const menu = useMobileSidebar();
  const headingId = `${menu.id}-heading`;

  return (
    <>
      <IconButton
        ref={menu.trigger}
        className={style.trigger}
        aria-label={mobileText.openNavigation}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-controls={menu.id}
        onClick={menu.handleOpen}
      >
        <Menu size={22} aria-hidden="true" />
      </IconButton>
      {createPortal(
        <dialog
          ref={menu.dialog}
          id={menu.id}
          className={classNames(style.panel, { [style.isClosing]: menu.closing })}
          aria-labelledby={headingId}
          onCancel={menu.handleCancel}
          onClose={menu.handleClose}
          onKeyDown={menu.handleKeyDown}
          onTransitionEnd={menu.handleTransitionEnd}
        >
          <div className={style.heading}>
            <h2 id={headingId}>{mobileText.navigationTitle}</h2>
            <IconButton
              className={style.close}
              aria-label={mobileText.closeNavigation}
              onClick={menu.close}
            >
              <X size={22} aria-hidden="true" />
            </IconButton>
          </div>
          <CanvasSidebar state={state} />
          <div className={style.actions}>
            <Button variant="primary" fullWidth onClick={menu.close}>
              {mobileText.returnToCanvas} <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
};
