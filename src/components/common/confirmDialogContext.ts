import { createContext, useContext, type ReactNode } from "react";

export type ConfirmDialogInput = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: ReactNode;
  tone?: "danger" | "default";
  title: string;
};

export type ConfirmDialogState = ConfirmDialogInput & {
  onResolve: (confirmed: boolean) => void;
};

export type ConfirmDialogContextValue = {
  confirm: (input: ConfirmDialogInput) => Promise<boolean>;
};

export const ConfirmDialogContext =
  createContext<ConfirmDialogContextValue | null>(null);

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog는 ConfirmDialogProvider 안에서 사용해야 합니다.");
  }

  return context;
}
