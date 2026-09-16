import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className = "", id, label, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label;

  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
      {label ? label : null}
      <input
        id={inputId}
        className={`h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100 ${className}`}
        {...props}
      />
    </label>
  );
}
