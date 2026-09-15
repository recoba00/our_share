import type { ReactNode } from "react";

type SegmentedControlOption<T extends string> = {
  icon?: ReactNode;
  label: ReactNode;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  onChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  value: T;
};

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      className="relative grid rounded-2xl bg-[var(--color-surface-muted)] p-1"
      role="tablist"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-xl bg-[var(--color-surface)] shadow-sm transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(${activeIndex * 100}%)`,
          width: `calc((100% - 0.5rem) / ${options.length})`,
        }}
      />
      {options.map((option) => (
        <button
          aria-selected={option.value === value}
          className={`relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-[color,transform] duration-200 active:scale-[0.98] ${
            option.value === value
              ? "text-brand"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          type="button"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
