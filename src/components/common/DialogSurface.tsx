import { X } from "@phosphor-icons/react";
import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useId } from "react";
import { IconButton } from "./IconButton";

export type DialogSurfaceVariant = "fullscreen" | "modal" | "sheet";

type DialogSurfaceProps = PropsWithChildren<{
  children: ReactNode;
  closeLabel?: string;
  contentClassName?: string;
  footer?: ReactNode;
  onClose: () => void;
  size?: "compact" | "standard";
  titleAction?: ReactNode;
  title: string;
  variant?: DialogSurfaceVariant;
}>;

export function DialogSurface({
  children,
  closeLabel = "닫기",
  contentClassName = "",
  footer,
  onClose,
  size = "standard",
  titleAction,
  title,
  variant = "modal",
}: DialogSurfaceProps) {
  const titleId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const panelClassName = {
    fullscreen: "flex h-dvh w-full flex-col bg-[var(--color-background)]",
    modal:
      "grid max-h-[calc(100dvh-32px)] w-full overflow-hidden rounded-t-card bg-[var(--color-surface)] shadow-xl sm:rounded-card",
    sheet:
      "grid max-h-[calc(100dvh-48px)] w-full overflow-hidden rounded-t-card bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] shadow-xl sm:mx-auto sm:mb-4 sm:max-w-lg sm:rounded-card",
  }[variant];
  const widthClassName = size === "compact" && variant === "modal" ? "sm:max-w-sm" : "sm:max-w-lg";
  const contentLayoutClassName = variant === "fullscreen" ? "min-h-0 flex-1" : "min-h-0";

  return (
    <section
      aria-labelledby={titleId}
      className={`${panelClassName} ${widthClassName}`}
    >
      {variant === "sheet" ? <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-300" /> : null}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {titleAction}
          <h2 className="min-w-0 truncate text-lg font-semibold leading-6" id={titleId}>
            {title}
          </h2>
        </div>
        <IconButton
          className="size-8 rounded-none bg-transparent hover:bg-transparent"
          label={closeLabel}
          onClick={onClose}
          variant="ghost"
        >
          <X size={20} weight="regular" />
        </IconButton>
      </header>
      <div className={`${contentLayoutClassName} overflow-y-auto p-4 ${contentClassName}`}>
        {children}
      </div>
      {footer ? <footer className="shrink-0 p-4 pt-0">{footer}</footer> : null}
    </section>
  );
}
