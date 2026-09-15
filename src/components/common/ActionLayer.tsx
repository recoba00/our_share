import { Plus, X } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { IconButton } from "./IconButton";

type ActionLayerProps = PropsWithChildren<{
  desktop?: boolean;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}>;

export function ActionLayer({ children, desktop = false, isOpen, onClose, title }: ActionLayerProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-40 bg-[var(--color-background)] ${desktop ? "" : "lg:hidden"}`}>
      <div className="flex h-dvh flex-col sheet-panel-enter">
        <header className="flex h-16 shrink-0 items-center justify-between bg-[var(--color-surface)] px-4">
          <h2 className="text-lg font-semibold leading-none">{title}</h2>
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
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    function handleScroll() {
      setIsScrolling(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsScrolling(false), 180);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <button
      className={`fixed bottom-28 right-4 z-30 inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-emerald-500/85 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 backdrop-blur-xl transition-all duration-300 hover:bg-brand-hover lg:hidden ${
        isScrolling ? "w-12 px-0" : "w-auto px-5"
      }`}
      onClick={onClick}
      type="button"
    >
      {isScrolling ? <Plus size={22} /> : label}
    </button>
  );
}
