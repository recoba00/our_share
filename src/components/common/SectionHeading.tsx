import type { ReactNode } from "react";

type SectionHeadingProps = {
  action?: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  level?: "h2" | "h3";
  title: ReactNode;
};

export function SectionHeading({
  action,
  description,
  icon,
  level = "h2",
  title,
}: SectionHeadingProps) {
  const Heading = level;

  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center text-brand">{icon}</span>
        <div className="min-w-0">
          <Heading className="min-w-0 truncate text-lg font-semibold leading-6">{title}</Heading>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
