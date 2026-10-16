import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Native focus trapping, Escape handling, and focus restoration for dialogs. */
export function Modal({
  title,
  description,
  onClose,
  children,
  initialFocus = 'input, textarea, select',
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  initialFocus?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef(document.activeElement);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>(initialFocus)?.focus();
    return () => {
      if (dialog?.open) dialog.close?.();
      if (opener.current instanceof HTMLElement && opener.current.isConnected)
        opener.current.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {description && (
        <p className="modal-description" id={descriptionId}>
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
