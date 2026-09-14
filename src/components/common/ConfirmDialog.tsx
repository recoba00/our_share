import { WarningCircle } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import {
  ConfirmDialogContext,
  type ConfirmDialogInput,
  type ConfirmDialogState,
} from "./confirmDialogContext";

export function ConfirmDialogProvider({ children }: PropsWithChildren) {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  const closeDialog = useCallback(
    (confirmed: boolean) => {
      dialog?.onResolve(confirmed);
      setDialog(null);
    },
    [dialog]
  );

  const confirm = useCallback((input: ConfirmDialogInput) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...input, onResolve: resolve });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {dialog
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4"
              role="dialog"
            >
              <button
                aria-label="닫기"
                className="absolute inset-0 size-full cursor-default"
                onClick={() => closeDialog(false)}
                type="button"
              />
              <section className="relative w-full max-w-sm rounded-card border border-white/70 bg-white/95 p-5 shadow-xl backdrop-blur-xl">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      dialog.tone === "danger"
                        ? "bg-red-50 text-red-500"
                        : "bg-brand-soft text-brand"
                    }`}
                  >
                    <WarningCircle size={22} weight="regular" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-6">{dialog.title}</h2>
                    <div className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {dialog.description}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <Button onClick={() => closeDialog(false)} type="button" variant="secondary">
                    {dialog.cancelLabel ?? "취소"}
                  </Button>
                  <Button
                    onClick={() => closeDialog(true)}
                    type="button"
                    variant={dialog.tone === "danger" ? "danger" : "primary"}
                  >
                    {dialog.confirmLabel ?? "확인"}
                  </Button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </ConfirmDialogContext.Provider>
  );
}
