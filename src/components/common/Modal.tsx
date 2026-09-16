import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { DialogSurface } from "./DialogSurface";

type ModalProps = PropsWithChildren<{
  closeLabel?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}>;

export function Modal({
  children,
  closeLabel = "닫기",
  footer,
  isOpen,
  onClose,
  title,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-4 sm:items-center"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 size-full cursor-default"
        onClick={onClose}
        type="button"
      />
      <DialogSurface
        closeLabel={closeLabel}
        footer={footer}
        onClose={onClose}
        title={title}
        variant="modal"
      >
        {children}
      </DialogSurface>
    </div>,
    document.body
  );
}
