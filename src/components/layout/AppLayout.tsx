import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "../navigation/BottomNavigation";

export function AppLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const isSecondDepth = /^\/chat\/[^/]+/.test(pathname);

  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col">
        <AppHeader />
        <main
          className={`min-w-0 flex-1 overflow-x-hidden px-4 pt-20 sm:px-6 lg:px-8 ${
            isSecondDepth ? "pb-4 lg:pb-8" : "pb-36 lg:pb-8"
          }`}
        >
          {children}
        </main>
        {!isSecondDepth ? <BottomNavigation /> : null}
      </div>
    </div>
  );
}
