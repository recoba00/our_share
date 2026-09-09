import { CheckCircle, Info, WarningCircle, X } from "@phosphor-icons/react";
import type { PropsWithChildren, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "./IconButton";
import {
  ToastContext,
  type ShowToastInput,
  type ToastVariant,
} from "./toastContext";

type ToastItem = {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
};

const toastStyles: Record<
  ToastVariant,
  { icon: ReactNode; ring: string; title: string }
> = {
  error: {
    icon: <WarningCircle className="text-red-500" size={22} weight="fill" />,
    ring: "border-red-100 bg-red-50 text-red-900",
    title: "오류",
  },
  info: {
    icon: <Info className="text-slate-500" size={22} weight="fill" />,
    ring: "border-slate-200 bg-white text-[var(--color-text-primary)]",
    title: "알림",
  },
  success: {
    icon: <CheckCircle className="text-brand" size={22} weight="fill" />,
    ring: "border-emerald-100 bg-emerald-50 text-emerald-950",
    title: "완료",
  },
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    ({ message, title, variant = "info" }: ShowToastInput) => {
      const id = crypto.randomUUID();

      setToasts((current) => [
        ...current,
        {
          id,
          message,
          title,
          variant,
        },
      ]);

      window.setTimeout(() => dismissToast(id), 4_000);
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport dismissToast={dismissToast} toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  dismissToast,
  toasts,
}: {
  dismissToast: (toastId: string) => void;
  toasts: ToastItem[];
}) {
  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-[60] grid gap-2 sm:inset-x-auto sm:right-4 sm:w-96"
    >
      {toasts.map((toast) => {
        const style = toastStyles[toast.variant];

        return (
          <section
            className={`flex items-start gap-3 rounded-card border p-4 shadow-lg ${style.ring}`}
            key={toast.id}
          >
            <div className="mt-0.5 shrink-0">{style.icon}</div>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-black">
                {toast.title ?? style.title}
              </strong>
              <p className="mt-1 text-sm leading-5">{toast.message}</p>
            </div>
            <IconButton
              className="size-9 bg-white/60"
              label="알림 닫기"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={16} weight="bold" />
            </IconButton>
          </section>
        );
      })}
    </div>,
    document.body
  );
}
