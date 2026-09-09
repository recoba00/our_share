import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}
