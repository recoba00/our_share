import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  variant?: "boxed" | "ghost";
};

export function IconButton({
  children,
  className = "",
  label,
  variant = "boxed",
  ...props
}: PropsWithChildren<IconButtonProps>) {
  const variants = {
    boxed:
      "border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]",
    ghost: "bg-transparent hover:bg-[var(--color-surface-muted)]",
  };

  return (
    <button
      aria-label={label}
      title={label}
      className={`grid size-11 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)] ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
