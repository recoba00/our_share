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
          className={`mx-auto min-w-0 w-full flex-1 overflow-x-hidden px-4 pt-20 sm:px-6 lg:px-8 ${
            isSecondDepth
              ? "h-[100dvh] min-h-0 overflow-y-hidden pb-4 lg:h-auto lg:overflow-y-visible lg:pb-8"
              : "pb-36 lg:pb-8"
          }`}
        >
          {children}
        </main>
        {!isSecondDepth ? <BottomNavigation /> : null}
      </div>
    </div>
  );
}
