import { X } from "@phosphor-icons/react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";

type BottomSheetProps = PropsWithChildren<{
  closeLabel?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}>;

export function BottomSheet({
  children,
  closeLabel = "닫기",
  footer,
  isOpen,
  onClose,
  title,
}: BottomSheetProps) {
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
    <div aria-modal="true" className="fixed inset-0 z-50 flex items-end bg-slate-950/45" role="dialog">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 size-full cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative grid max-h-[calc(100vh-48px)] w-full overflow-hidden rounded-t-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl sm:mx-auto sm:mb-4 sm:max-w-lg sm:rounded-card">
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-300" />
        <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] p-4">
          <h2 className="min-w-0 truncate text-lg font-black">{title}</h2>
          <IconButton label={closeLabel} onClick={onClose}>
            <X size={18} weight="bold" />
          </IconButton>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer ? (
          <footer className="border-t border-[var(--color-border)] p-4">{footer}</footer>
        ) : null}
      </section>
    </div>,
    document.body
  );
}
