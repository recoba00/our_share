import { Plus } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { DialogSurface } from "./DialogSurface";

type ActionLayerProps = PropsWithChildren<{
  desktop?: boolean;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}>;

export function ActionLayer({ children, desktop = false, isOpen, onClose, title }: ActionLayerProps) {
  const [visualViewport, setVisualViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);

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
    if (!isOpen || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    function syncVisualViewport() {
      setVisualViewport({
        height: viewport.height,
        offsetTop: viewport.offsetTop,
      });
    }

    syncVisualViewport();
    viewport.addEventListener("resize", syncVisualViewport);
    viewport.addEventListener("scroll", syncVisualViewport);

    return () => {
      viewport.removeEventListener("resize", syncVisualViewport);
      viewport.removeEventListener("scroll", syncVisualViewport);
      setVisualViewport(null);
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className={`fixed inset-0 z-50 bg-[var(--color-background)] ${desktop ? "" : "lg:hidden"}`}
      role="dialog"
      style={
        visualViewport
          ? {
              bottom: "auto",
              height: `${visualViewport.height}px`,
              top: `${visualViewport.offsetTop}px`,
            }
          : undefined
      }
    >
      <div className="h-full min-h-0 sheet-panel-enter">
        <DialogSurface
          contentClassName="pb-28"
          onClose={onClose}
          title={title}
          variant="fullscreen"
        >
          {children}
        </DialogSurface>
      </div>
    </div>
  );
}

export function MobileCreateButton({
  desktop = false,
  label,
  onClick,
}: {
  desktop?: boolean;
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
      className={`fixed bottom-28 right-4 z-30 inline-flex h-12 items-center justify-center rounded-full border border-white/70 bg-emerald-500/85 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 backdrop-blur-xl transition-all duration-300 hover:bg-brand-hover ${desktop ? "lg:bottom-8" : "lg:hidden"} ${
        isScrolling ? "w-12 px-0" : "w-auto px-5"
      }`}
      onClick={onClick}
      type="button"
    >
      {isScrolling ? <Plus size={22} /> : label}
    </button>
  );
}
