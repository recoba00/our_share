import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "danger" | "primary" | "secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  const variants: Record<ButtonVariant, string> = {
    danger: "bg-red-500 text-white hover:bg-red-600",
    primary: "bg-brand text-white hover:bg-brand-hover",
    secondary:
      "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
  };

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
