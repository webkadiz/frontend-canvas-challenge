import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEventHandler, ReactEventHandler, TransitionEventHandler } from 'react';

/** Управляет мобильной панелью, её анимацией и возвратом фокуса к кнопке открытия. */
export const useMobileSidebar = () => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  const finishClose = () => {
    setOpen(false);
    setClosing(false);
  };

  useEffect(() => {
    if (!open) return;

    const element = dialog.current!;
    const button = trigger.current;
    const overflow = document.body.style.overflow;

    element.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      // Вложенный диалог может завершить очистку позже при смене ширины экрана.
      queueMicrotask(() => {
        if (!document.querySelector('dialog[open]')) document.body.style.overflow = overflow;
      });
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(finishClose, 240);

    return () => window.clearTimeout(timer);
  }, [closing]);

  const handleOpen = () => setOpen(true);

  const close = () => {
    if (closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finishClose();
    else setClosing(true);
  };

  const handleCancel: ReactEventHandler<HTMLDialogElement> = (event) => {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    close();
  };

  const handleClose: ReactEventHandler<HTMLDialogElement> = (event) => {
    if (event.target === event.currentTarget) finishClose();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDialogElement> = (event) => event.stopPropagation();

  const handleTransitionEnd: TransitionEventHandler<HTMLDialogElement> = (event) => {
    if (closing && event.target === event.currentTarget && event.propertyName === 'transform')
      finishClose();
  };

  return {
    open,
    closing,
    dialog,
    trigger,
    id,
    handleOpen,
    close,
    finishClose,
    handleCancel,
    handleClose,
    handleKeyDown,
    handleTransitionEnd,
  };
};
