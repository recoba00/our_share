import { CaretLeft, GearSix, UsersThree } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Button } from "../common/Button";

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);
  const isHome = title === "스마트 홈";
  const isProfile = pathname.startsWith("/profile");
  const isSettings = pathname.startsWith("/settings");

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:px-6 lg:static lg:px-0">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          {isSettings ? (
            <>
              <Link aria-label="내 정보로 돌아가기" className="grid size-10 place-items-center" to="/profile">
                <CaretLeft size={24} weight="bold" />
              </Link>
              <h1 className="text-lg font-black leading-10">{title}</h1>
            </>
          ) : isHome ? (
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
          {isProfile ? (
            <Link aria-label="설정" className="grid size-11 place-items-center" to="/settings">
              <GearSix size={24} weight="bold" />
            </Link>
          ) : status === "authenticated" ? (
            <Link
              aria-label="내 정보"
              className="grid size-11 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-brand-soft text-sm font-black text-brand"
              to="/profile"
            >
              {user?.photoURL ? (
                <img
                  alt={user.displayName ?? "사용자"}
                  className="size-full rounded-full object-cover"
                  src={user.photoURL}
                />
              ) : (
                (user?.displayName ?? user?.email ?? "?").slice(0, 1)
              )}
            </Link>
          ) : null}
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

  if (pathname.startsWith("/profile")) {
    return "내 정보";
  }

  if (pathname.startsWith("/settings")) {
    return "설정";
  }

  return "스마트 홈";
}
