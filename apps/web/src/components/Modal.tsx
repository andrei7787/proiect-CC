import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: "danger" | "default";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  variant = "default",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = "modal-title";

  /* ── Body scroll lock ────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  /* ── Save / restore focus ────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      // Focus the panel after the animation frame so the browser has painted it
      requestAnimationFrame(() => {
        panelRef.current?.focus();
      });
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  /* ── Escape key ──────────────────────────────────── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = getFocusableElements(panelRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  /* ── Click backdrop (not panel) ──────────────────── */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <>
      {/* ── Injected keyframe styles ─────────────────── */}
      <style>{`
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(8, 11, 20, 0.65);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: modal-fade-in 180ms ease-out both;
        }
        .modal-panel {
          background: var(--bg-card, #181e38);
          border: 1px solid var(--border, #1e2550);
          border-radius: var(--radius, 12px);
          padding: 28px 30px;
          max-width: 440px;
          width: calc(100% - 40px);
          outline: none;
          animation: modal-slide-up 250ms cubic-bezier(0.4, 0, 0.2, 1) both;
          position: relative;
        }
        .modal-title {
          font-family: var(--font-heading, 'Outfit', sans-serif);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--text, #e2e8f8);
          margin: 0 0 14px;
          padding-right: 28px;
        }
        .modal-body {
          color: var(--text-dim, #8a91b8);
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 22px;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .modal-btn {
          padding: 9px 20px;
          border-radius: var(--radius-sm, 7px);
          font-family: var(--font-body, 'DM Sans', sans-serif);
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid var(--border, #1e2550);
          background: var(--bg-hover, #1f2647);
          color: var(--text-dim, #8a91b8);
          transition: all var(--ease, 200ms cubic-bezier(0.4, 0, 0.2, 1));
        }
        .modal-btn:hover {
          background: var(--accent-bg, rgba(115, 138, 255, 0.08));
          border-color: var(--accent-border, rgba(115, 138, 255, 0.2));
          color: var(--accent-glow, #94a6ff);
        }
        .modal-btn:focus-visible {
          outline: 2px solid var(--accent, #738aff);
          outline-offset: 2px;
        }
        .modal-btn-primary {
          background: var(--accent, #738aff);
          color: #fff;
          border-color: var(--accent, #738aff);
        }
        .modal-btn-primary:hover {
          background: var(--accent-soft, #5b6fd9);
          border-color: var(--accent-soft, #5b6fd9);
          color: #fff;
        }
        .modal-btn-danger {
          background: var(--red, #f25f5c);
          color: #fff;
          border-color: var(--red, #f25f5c);
        }
        .modal-btn-danger:hover {
          background: #e04845;
          border-color: #e04845;
          color: #fff;
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 16px;
          background: none;
          border: none;
          color: var(--text-faint, #555d80);
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          transition: color var(--ease, 200ms cubic-bezier(0.4, 0, 0.2, 1));
        }
        .modal-close:hover {
          color: var(--text-dim, #8a91b8);
        }
        .modal-close:focus-visible {
          outline: 2px solid var(--accent, #738aff);
          outline-offset: 2px;
        }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────── */}
      <div
        className="modal-backdrop"
        onClick={handleBackdropClick}
        role="presentation"
      >
        <div
          ref={panelRef}
          className="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>

          <h2 id={titleId} className="modal-title">
            {title}
          </h2>

          <div className="modal-body">{children}</div>

          <div className="modal-actions">
            <button type="button" className="modal-btn" onClick={onClose}>
              Cancel
            </button>
            {onConfirm && (
              <button
                type="button"
                className={`modal-btn modal-btn-primary${isDanger ? " modal-btn-danger" : ""}`}
                onClick={onConfirm}
              >
                {confirmLabel ?? "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Helpers ──────────────────────────────────────── */

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => (el as HTMLElement).offsetParent !== null,
  );
}
