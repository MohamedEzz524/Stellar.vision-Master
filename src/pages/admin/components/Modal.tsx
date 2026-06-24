import { useEffect, type ReactNode } from 'react';

/**
 * Tiny dialog primitive. Closes on Escape and on backdrop click.
 *
 * Kept dependency-free (no portal / no focus trap library) because the admin
 * dashboard is a low-traffic internal tool and the modal is only opened
 * from a logged-in admin's own clicks — the extra UX polish isn't worth
 * pulling in a dialog library for this one use case.
 */
const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-2 py-2 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${SIZE_CLASSES[size]} max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-6`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-grid text-base font-bold tracking-wider text-white uppercase sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="text-sm text-white/80">{children}</div>
        {footer && (
          <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
