import { Check } from "@phosphor-icons/react";
import type { InputHTMLAttributes } from "react";

type AnimatedCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function AnimatedCheckbox({ className = "", ...props }: AnimatedCheckboxProps) {
  return (
    <span className="relative grid size-5 shrink-0 place-items-center">
      <input
        {...props}
        className={`peer absolute inset-0 z-10 size-full cursor-pointer opacity-0 ${className}`}
        type="checkbox"
      />
      <span className="pointer-events-none grid size-5 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-white transition-[background-color,border-color,transform] duration-200 ease-out peer-checked:scale-105 peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-100">
        <Check className="animated-checkbox-check" size={14} weight="bold" />
      </span>
    </span>
  );
}
