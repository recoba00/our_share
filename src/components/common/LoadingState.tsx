import { Card } from "./Card";

export function LoadingState({ title = "불러오는 중이에요" }: { title?: string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="size-3 animate-pulse rounded-full bg-brand" />
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          {title}
        </p>
      </div>
    </Card>
  );
}
