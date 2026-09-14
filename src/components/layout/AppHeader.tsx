import {
  Bell,
  CalendarCheck,
  CaretLeft,
  ChatCircleDots,
  GearSix,
  NotePencil,
  SealQuestion,
  UsersThree,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Button } from "../common/Button";

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { pathname } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const title = getPageTitle(pathname);
  const isHome = title === "스마트 홈";
  const isProfile = pathname.startsWith("/profile");
  const isSettings = pathname.startsWith("/settings");
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);

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
          ) : isChatRoom ? (
            <>
              <Link aria-label="채팅 목록으로 돌아가기" className="grid size-10 place-items-center" to="/chat">
                <CaretLeft size={24} weight="bold" />
              </Link>
              <h1 className="text-lg font-black leading-10">채팅방</h1>
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
        <div className="relative flex items-center gap-2">
          {status === "authenticated" && (
            <Button className="hidden sm:inline-flex" onClick={signOut} variant="secondary">
              로그아웃
            </Button>
          )}
          {status === "authenticated" && !isSettings ? (
            <button
              aria-label="알림"
              className="relative grid size-11 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
              type="button"
            >
              <Bell size={24} weight="bold" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-brand" />
            </button>
          ) : null}
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
          {isNotificationsOpen ? (
            <div className="absolute right-0 top-14 z-30 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-xl">
              <NotificationLink
                description="오늘 일정과 월간 일정을 확인하세요."
                icon={<CalendarCheck size={20} weight="bold" />}
                label="캘린더 확인"
                onClick={() => setIsNotificationsOpen(false)}
                to="/calendar"
              />
              <NotificationLink
                description="진행 중인 가족 투표를 확인하세요."
                icon={<SealQuestion size={20} weight="bold" />}
                label="투표 확인"
                onClick={() => setIsNotificationsOpen(false)}
                to="/poll"
              />
              <NotificationLink
                description="가족 채팅방 새 소식을 확인하세요."
                icon={<ChatCircleDots size={20} weight="bold" />}
                label="채팅 확인"
                onClick={() => setIsNotificationsOpen(false)}
                to="/chat"
              />
              <NotificationLink
                description="최근 공유 메모를 확인하세요."
                icon={<NotePencil size={20} weight="bold" />}
                label="메모 확인"
                onClick={() => setIsNotificationsOpen(false)}
                to="/memo"
              />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function NotificationLink({
  description,
  icon,
  label,
  onClick,
  to,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  to: string;
}) {
  return (
    <Link
      className="flex items-start gap-3 rounded-xl p-3 text-left transition hover:bg-[var(--color-surface-muted)]"
      onClick={onClick}
      to={to}
    >
      <span className="mt-0.5 text-brand">{icon}</span>
      <span className="min-w-0">
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-[var(--color-text-secondary)]">
          {description}
        </span>
      </span>
    </Link>
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
