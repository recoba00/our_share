import { WarningCircle } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { DialogSurface } from "./DialogSurface";
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
              className="fixed inset-0 z-[70] flex items-end bg-slate-950/45 p-4 sm:items-center"
              role="dialog"
            >
              <button
                aria-label="닫기"
                className="absolute inset-0 size-full cursor-default"
                onClick={() => closeDialog(false)}
                type="button"
              />
              <div className="relative z-10 w-full">
                <DialogSurface
                  closeLabel="닫기"
                  footer={
                    <div className="grid gap-2 sm:grid-cols-2">
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
                  }
                  onClose={() => closeDialog(false)}
                  size="compact"
                  title={dialog.title}
                  variant="modal"
                >
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
                    <p className="min-w-0 text-sm leading-6 text-[var(--color-text-secondary)]">
                      {dialog.description}
                    </p>
                  </div>
                </DialogSurface>
              </div>
            </div>,
            document.body
          )
        : null}
    </ConfirmDialogContext.Provider>
  );
}
