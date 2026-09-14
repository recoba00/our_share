import { Trash } from "@phosphor-icons/react";

type PollOptionEditorProps = {
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  options: string[];
};

export function PollOptionEditor({
  onAdd,
  onRemove,
  onUpdate,
  options,
}: PollOptionEditorProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">투표 항목</span>
        <button className="text-sm font-semibold text-brand" onClick={onAdd} type="button">
          + 항목 추가
        </button>
      </div>
      <div className="grid gap-2">
        {options.map((option, index) => (
          <div className="flex items-center gap-2" key={index}>
            <input
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => onUpdate(index, event.target.value)}
              placeholder={`항목 ${index + 1}`}
              value={option}
            />
            <button
              aria-label={`항목 ${index + 1} 삭제`}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-slate-500 transition hover:text-red-500 disabled:opacity-40"
              disabled={options.length <= 2}
              onClick={() => onRemove(index)}
              type="button"
            >
              <Trash size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
