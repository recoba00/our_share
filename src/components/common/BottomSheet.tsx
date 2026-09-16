import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DialogSurface } from "./DialogSurface";

type BottomSheetProps = PropsWithChildren<{
  closeLabel?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  titleAction?: ReactNode;
  title: string;
}>;

export function BottomSheet({
  children,
  closeLabel = "닫기",
  footer,
  isOpen,
  onClose,
  titleAction,
  title,
}: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(isOpen);

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

  useEffect(() => {
    if (isOpen || !isVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, isVisible]);

  const isClosing = !isOpen && isVisible;

  if (!isOpen && !isVisible) {
    return null;
  }

  return createPortal(
    <div
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-end bg-slate-950/45 ${
        isClosing ? "sheet-backdrop-exit" : "sheet-backdrop-enter"
      }`}
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 size-full cursor-default"
        onClick={onClose}
        type="button"
      />
      <div
        className={`relative w-full ${
          isClosing ? "sheet-panel-exit" : "sheet-panel-enter"
        }`}
      >
        <DialogSurface
          closeLabel={closeLabel}
          footer={footer}
          onClose={onClose}
          title={title}
          titleAction={titleAction}
          variant="sheet"
        >
          {children}
        </DialogSurface>
      </div>
    </div>,
    document.body
  );
}
