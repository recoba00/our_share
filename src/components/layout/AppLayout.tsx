import type { PropsWithChildren } from "react";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "../navigation/BottomNavigation";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col lg:px-8">
        <AppHeader />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-36 pt-4 sm:px-6 lg:px-0 lg:pb-8">
          {children}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
}
