import { GearSix, UsersThree } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Button } from "../common/Button";
import { IconButton } from "../common/IconButton";

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);
  const isHome = title === "스마트 홈";

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 lg:static lg:px-0">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          {isHome ? (
            <>
              <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <UsersThree size={22} weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                  우리 가족
                </p>
                <h1 className="text-lg font-bold leading-6">스마트 홈</h1>
              </div>
            </>
          ) : (
            <h1 className="text-lg font-black leading-10">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "authenticated" && (
            <Button className="hidden sm:inline-flex" onClick={signOut} variant="secondary">
              로그아웃
            </Button>
          )}
          {user?.photoURL && (
            <img
              alt={user.displayName ?? "사용자"}
              className="size-11 rounded-xl border border-[var(--color-border)]"
              src={user.photoURL}
            />
          )}
          <IconButton label="설정">
            <GearSix size={22} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/chat")) {
    return "채팅";
  }

  if (pathname.startsWith("/poll")) {
    return "투표";
  }

  if (pathname.startsWith("/memo")) {
    return "메모";
  }

  if (pathname.startsWith("/calendar")) {
    return "캘린더";
  }

  if (pathname.startsWith("/diagnostics")) {
    return "진단";
  }

  return "스마트 홈";
}
