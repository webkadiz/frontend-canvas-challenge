import { Button, IconButton, Field } from './ui';
import { Pencil, PanelsTopLeft, X, Plus } from 'lucide-react';
import type {
  ReactEventHandler,
  KeyboardEventHandler,
  TransitionEventHandler,
  FormEventHandler,
  ChangeEventHandler,
} from 'react';
import { spaceDialogText } from '../constants/space-dialog';
import classNames from 'classnames';
import style from './SpaceTitleDialog.module.scss';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Настройки диалога создания или переименования пространства. */
export type SpaceTitleDialogProps = {
  /** Запрещено ли открывать диалог и отправлять название. */
  disabled: boolean;
  /** Сохраняет название; возвращает сообщение об ошибке или null при успехе. */
  onSubmit: (title: string) => Promise<string | null>;
  /** Режим диалога; по умолчанию создаётся новое пространство. */
  mode?: 'create' | 'rename';
  /** Название, которым заполняется поле при открытии. */
  initialTitle?: string;
};

/** Диалог создания или переименования пространства с проверкой названия. */
export const SpaceTitleDialog = ({
  disabled,
  onSubmit,
  mode = 'create',
  initialTitle = '',
}: SpaceTitleDialogProps) => {
  const renaming = mode === 'rename';
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const headingId = `${id}-heading`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    if (!open) return;

    const element = dialog.current!;
    const triggerElement = trigger.current;
    const overflow = document.body.style.overflow;

    element.showModal();
    input.current?.focus({ preventScroll: true });

    if (renaming) input.current?.select();

    document.body.style.overflow = 'hidden';

    return () => {
      if (element.open) element.close();

      document.body.style.overflow = overflow;
      triggerElement?.focus({ preventScroll: true });
    };
  }, [open, renaming]);

  const finishClose = () => {
    setOpen(false);
    setClosing(false);
  };

  useEffect(() => {
    if (!closing) return;

    const timer = window.setTimeout(finishClose, 240);

    return () => window.clearTimeout(timer);
  }, [closing]);

  const close = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) finishClose();
    else setClosing(true);
  };

  const handleOpen = () => {
    setTitle(initialTitle);
    setError(null);
    setOpen(true);
  };

  const handleCancel: ReactEventHandler<HTMLDialogElement> = (event) => {
    event.preventDefault();

    if (!submitting.current) close();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDialogElement> = (event) => event.stopPropagation();

  const handleTransitionEnd: TransitionEventHandler<HTMLDialogElement> = (event) => {
    if (closing && event.target === event.currentTarget && event.propertyName === 'opacity')
      finishClose();
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const name = title.trim();

    if (submitting.current || disabled || closing || !name || name.length > 80) return;

    if (renaming && name === initialTitle.trim()) return;

    submitting.current = true;
    setPending(true);
    setError(null);

    try {
      const message = await onSubmit(name);

      if (message) setError(message);
      else close();
    } catch {
      setError(spaceDialogText.saveFailed);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  const handleTitleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setTitle(event.target.value);
    setError(null);
  };

  return (
    <>
      <div className={renaming ? style.renameSpace : style.newSpace}>
        <Button
          ref={trigger}
          type="button"
          variant={renaming ? 'unstyled' : 'secondary'}
          fullWidth={!renaming}
          className={renaming ? style.renameSpaceButton : undefined}
          aria-label={renaming ? spaceDialogText.renameTrigger : undefined}
          title={renaming ? spaceDialogText.renameTrigger : undefined}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={id}
          onClick={handleOpen}
        >
          {renaming ? (
            <Pencil size={18} aria-hidden="true" />
          ) : (
            <>
              <Plus size={16} aria-hidden="true" /> {spaceDialogText.createTrigger}
            </>
          )}
        </Button>
      </div>
      {createPortal(
        <dialog
          ref={dialog}
          id={id}
          className={classNames(style.spaceDialog, {
            [style.isClosing]: closing,
          })}
          aria-labelledby={headingId}
          aria-describedby={descriptionId}
          onCancel={handleCancel}
          onClose={finishClose}
          onKeyDown={handleKeyDown}
          onTransitionEnd={handleTransitionEnd}
        >
          <form onSubmit={handleSubmit}>
            <div className={style.spaceDialogHeading}>
              <span className={style.spaceDialogSymbol} aria-hidden="true">
                <PanelsTopLeft size={28} aria-hidden="true" />
              </span>
              <IconButton
                type="button"
                className={style.spaceDialogClose}
                aria-label={spaceDialogText.close}
                disabled={pending || closing}
                onClick={close}
              >
                <X size={20} aria-hidden="true" />
              </IconButton>
            </div>
            <h2 id={headingId}>
              {renaming ? spaceDialogText.renameTrigger : spaceDialogText.createTitle}
            </h2>
            <p id={descriptionId}>
              {renaming ? spaceDialogText.renameDescription : spaceDialogText.createDescription}
            </p>
            <Field
              ref={input}
              frameClassName={style.spaceDialogField}
              label={spaceDialogText.name}
              hint={spaceDialogText.limit}
              error={error ?? undefined}
              autoFocus
              name="spaceTitle"
              placeholder={spaceDialogText.placeholder}
              maxLength={80}
              required
              autoComplete="off"
              value={title}
              disabled={pending || closing}
              onChange={handleTitleChange}
            />
            <div className={style.spaceDialogActions}>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || closing}
                onClick={close}
              >
                {spaceDialogText.cancel}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  pending ||
                  disabled ||
                  closing ||
                  !title.trim() ||
                  (renaming && title.trim() === initialTitle.trim())
                }
                aria-busy={pending}
              >
                {pending && <span className={style.spaceDialogSpinner} aria-hidden="true" />}
                {pending
                  ? renaming
                    ? spaceDialogText.saving
                    : spaceDialogText.creating
                  : renaming
                    ? spaceDialogText.save
                    : spaceDialogText.create}
              </Button>
            </div>
          </form>
        </dialog>,
        document.body,
      )}
    </>
  );
};
