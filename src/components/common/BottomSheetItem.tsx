import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type BottomSheetItemProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
    tone?: "default" | "danger";
  }
>;

export function BottomSheetItem({
  active = false,
  children,
  className = "",
  tone = "default",
  ...props
}: BottomSheetItemProps) {
  const stateClassName =
    tone === "danger"
      ? "bg-red-50 text-red-600 hover:bg-red-100"
      : active
        ? "bg-brand-soft text-brand"
        : "bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] hover:text-brand";

  return (
    <button
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${stateClassName} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
