import { X } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { IconButton } from "./IconButton";

type ActionLayerProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
}>;

export function ActionLayer({ children, isOpen, onClose, title }: ActionLayerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-[var(--color-background)] lg:hidden">
      <div className="flex h-dvh flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
          <h2 className="text-base font-black">{title}</h2>
          <IconButton label="닫기" onClick={onClose} variant="ghost">
            <X size={20} weight="bold" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto p-4 pb-28">{children}</div>
      </div>
    </div>
  );
}

export function MobileCreateButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="fixed bottom-28 right-4 z-30 inline-flex h-12 items-center justify-center rounded-full bg-brand px-5 text-sm font-black text-white shadow-lg transition hover:bg-brand-hover lg:hidden"
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
