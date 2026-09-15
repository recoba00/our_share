import {
  Bell,
  CalendarCheck,
  CaretLeft,
  ChatCircleDots,
  GearSix,
  NotePencil,
  SealQuestion,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { Button } from "../common/Button";

type LocationState = {
  chatRoomName?: string;
};

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { pathname, state } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const locationState = state as LocationState | null;
  const title = getPageTitle(pathname);
  const isHome = title === "우리끼리";
  const isProfile = pathname.startsWith("/profile");
  const isSettings = pathname.startsWith("/settings");
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/60 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {isSettings ? (
            <>
              <Link aria-label="내 정보로 돌아가기" className="grid size-8 place-items-center" to="/profile">
                <CaretLeft size={22} />
              </Link>
              <h1 className="text-lg font-semibold leading-8">{title}</h1>
            </>
          ) : isChatRoom ? (
            <>
              <Link aria-label="채팅 목록으로 돌아가기" className="grid size-8 place-items-center lg:hidden" to="/chat">
                <CaretLeft size={22} />
              </Link>
              <h1 className="min-w-0 truncate text-lg font-semibold leading-8 lg:hidden">
                {locationState?.chatRoomName ?? "채팅방"}
              </h1>
              <h1 className="hidden text-lg font-semibold leading-8 lg:block">채팅</h1>
            </>
          ) : isHome ? (
            <>
              <img
                alt=""
                className="size-8 rounded-xl object-cover"
                src={`${import.meta.env.BASE_URL}brand-logo.svg`}
              />
              <h1 className="text-lg font-semibold leading-8">우리끼리</h1>
            </>
          ) : (
            <h1 className="text-lg font-semibold leading-8">{title}</h1>
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
              className="relative grid size-8 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-white/70 hover:text-[var(--color-text-primary)]"
              onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
              type="button"
            >
              <Bell size={21} />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand" />
            </button>
          ) : null}
          {isProfile ? (
            <Link aria-label="설정" className="grid size-8 place-items-center" to="/settings">
              <GearSix size={21} />
            </Link>
          ) : status === "authenticated" ? (
            <Link
              aria-label="내 정보"
              className="grid size-8 place-items-center overflow-hidden rounded-full bg-brand-soft text-sm font-semibold text-brand ring-1 ring-inset ring-black/[0.04]"
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

  return "우리끼리";
}
