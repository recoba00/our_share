import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export function IconButton({
  children,
  className = "",
  label,
  ...props
}: PropsWithChildren<IconButtonProps>) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`grid size-11 place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
