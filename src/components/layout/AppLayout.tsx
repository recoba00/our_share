import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { BottomNavigation } from "../navigation/BottomNavigation";
import { ChatMemberDrawerProvider } from "../chat/ChatMemberDrawerProvider";
import { useAuth } from "../../features/auth/useAuth";
import { savePendingInviteCode } from "../../features/family/services/pendingInviteService";

export function AppLayout({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const { status } = useAuth();
  const isSecondDepth = /^\/chat\/[^/]+/.test(pathname);

  useEffect(() => {
    const usesGuestChrome = status !== "authenticated";
    const themeColor = usesGuestChrome ? "#111111" : "#10b981";
    const statusBarStyle = usesGuestChrome ? "black-translucent" : "default";

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute("content", statusBarStyle);
  }, [status]);

  useEffect(() => {
    if (status !== "guest") {
      return;
    }

    const inviteCode = pathname.match(/^\/invite\/([A-Za-z0-9]{6})$/)?.[1];
    if (inviteCode) {
      savePendingInviteCode(inviteCode.toUpperCase());
    }
  }, [pathname, status]);

  if (status === "loading" && pathname !== "/") {
    return null;
  }

  if (status === "guest") {
    if (pathname !== "/") {
      return <Navigate replace to="/" />;
    }

    return (
      <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none">
        {children}
      </div>
    );
  }

  return (
    <ChatMemberDrawerProvider>
      <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-text-primary)]">
        <div className="mx-auto flex min-h-dvh w-full max-w-screen-2xl flex-col">
          <AppHeader />
          <main
            className={`mx-auto min-w-0 w-full flex-1 overflow-x-hidden px-4 pt-[calc(5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 ${
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
    </ChatMemberDrawerProvider>
  );
}
