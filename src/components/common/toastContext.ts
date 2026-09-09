import { createContext, useContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ShowToastInput = {
  message: string;
  title?: string;
  variant?: ToastVariant;
};

export type ToastContextValue = {
  showToast: (input: ShowToastInput) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast는 ToastProvider 안에서 사용해야 합니다.");
  }

  return context;
}
