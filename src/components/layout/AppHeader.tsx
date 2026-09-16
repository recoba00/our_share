import {
  Bell,
  CalendarCheck,
  ArrowLeft,
  CaretDown,
  Check,
  ChatCircleDots,
  GearSix,
  NotePencil,
  SealQuestion,
  UsersThree,
} from "@phosphor-icons/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Input } from "../common/Input";
import { useAuth } from "../../features/auth/useAuth";
import { createFamily } from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";
import { BottomSheet } from "../common/BottomSheet";
import { BottomSheetItem } from "../common/BottomSheetItem";
import { Button } from "../common/Button";
import { SegmentedControl } from "../common/SegmentedControl";
import { useToast } from "../common/toastContext";
import type { Family } from "../../features/family/types/familyTypes";
import { mainNavigationItems } from "../navigation/navigationItems";

type LocationState = {
  chatRoomName?: string;
};

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { activeFamily, families, refreshFamilies, selectFamily } = useFamily();
  const { showToast } = useToast();
  const { pathname, state } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const locationState = state as LocationState | null;
  const title = getPageTitle(pathname);
  const isHome = title === "우리끼리";
  const isProfile = pathname.startsWith("/profile");
  const isSettings = pathname.startsWith("/settings");
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {isSettings ? (
            <>
              <Link aria-label="내 정보로 돌아가기" className="grid size-8 place-items-center" to="/profile">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="text-lg font-semibold leading-none">{title}</h1>
            </>
          ) : isChatRoom ? (
            <>
              <Link aria-label="채팅 목록으로 돌아가기" className="grid size-8 place-items-center lg:hidden" to="/chat">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="min-w-0 truncate text-lg font-semibold leading-none lg:hidden">
                {locationState?.chatRoomName ?? "채팅방"}
              </h1>
              <h1 className="hidden text-lg font-semibold leading-none lg:block">채팅</h1>
            </>
          ) : isHome ? (
            <div className="flex min-w-0 items-center gap-3">
              <img
                alt=""
                className="size-8 rounded-xl object-cover"
                src={`${import.meta.env.BASE_URL}brand-logo.svg`}
              />
              {status === "authenticated" ? (
                <GroupSwitcher
                  activeFamilyId={activeFamily?.id ?? ""}
                  compact
                  families={families}
                  onCreateFamily={() => setIsCreateFamilyOpen(true)}
                  onSelect={selectFamily}
                  userId={user?.uid}
                />
              ) : null}
            </div>
          ) : (
            <h1 className="text-lg font-semibold leading-none">{title}</h1>
          )}
        </div>
        <nav aria-label="주요 메뉴" className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
          {mainNavigationItems.map(({ to, label }) => (
            <NavLink
              className={({ isActive }) =>
                `inline-flex h-10 items-center gap-2 px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? "text-brand"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`
              }
              key={to}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="relative flex items-center gap-4">
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
                description="진행 중인 그룹 투표를 확인하세요."
                icon={<SealQuestion size={20} weight="bold" />}
                label="투표 확인"
                onClick={() => setIsNotificationsOpen(false)}
                to="/poll"
              />
              <NotificationLink
                description="그룹 채팅방 새 소식을 확인하세요."
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
      {user ? (
        <BottomSheet
          isOpen={isCreateFamilyOpen}
          onClose={() => {
            setIsCreateFamilyOpen(false);
            setNewFamilyName("");
          }}
          title="그룹 생성"
        >
          <form className="grid gap-4" onSubmit={(event) => void handleCreateFamily(event)}>
            <div>
              <p className="text-sm font-semibold text-brand">새 그룹 만들기</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                그룹을 만든 뒤 바로 해당 그룹으로 전환합니다.
              </p>
            </div>
            <Input
              autoFocus
              label="그룹 이름"
              onChange={(event) => setNewFamilyName(event.target.value)}
              placeholder="새 그룹 이름을 입력해주세요"
              value={newFamilyName}
            />
            <Button disabled={isCreatingFamily} type="submit">
              <UsersThree size={18} weight="bold" />
              생성하기
            </Button>
          </form>
        </BottomSheet>
      ) : null}
    </header>
  );

  async function handleCreateFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const normalizedName = newFamilyName.trim();

    if (!normalizedName) {
      showToast({ message: "그룹 이름을 입력해주세요.", variant: "info" });
      return;
    }

    setIsCreatingFamily(true);

    try {
      const result = await createFamily({ name: normalizedName, owner: user });
      await refreshFamilies(result.id);
      setNewFamilyName("");
      setIsCreateFamilyOpen(false);
      showToast({ message: "그룹을 생성했습니다.", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "그룹 생성에 실패했습니다.",
        variant: "error",
      });
    } finally {
      setIsCreatingFamily(false);
    }
  }
}

function GroupSwitcher({
  activeFamilyId,
  compact = false,
  families,
  onCreateFamily,
  onSelect,
  userId,
}: {
  activeFamilyId: string;
  compact?: boolean;
  families: Family[];
  onCreateFamily: () => void;
  onSelect: (familyId: string) => void;
  userId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupTab, setGroupTab] = useState<"OWNER" | "MEMBER">("OWNER");
  const activeFamily = families.find((family) => family.id === activeFamilyId) ?? families[0] ?? null;
  const ownerFamilies = families.filter((family) => family.role === "OWNER" || family.ownerId === userId);
  const memberFamilies = families.filter((family) => family.role !== "OWNER" && family.ownerId !== userId);
  const visibleGroupTab = groupTab === "OWNER" && ownerFamilies.length === 0 && memberFamilies.length > 0
    ? "MEMBER"
    : groupTab;
  const visibleFamilies = visibleGroupTab === "OWNER" ? ownerFamilies : memberFamilies;

  return (
    <div className={`relative min-w-0 ${compact ? "max-w-[min(46vw,190px)]" : "max-w-[min(44vw,180px)]"}`}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={
          compact
            ? "flex max-w-full min-w-0 items-center gap-1 text-lg font-semibold leading-none transition hover:text-brand"
            : "flex h-8 max-w-full items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/70 px-3 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-brand hover:text-brand"
        }
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">
          {activeFamily ? truncateFamilyName(activeFamily.name) : "그룹 선택"}
        </span>
        {compact ? <CaretDown className="shrink-0 text-[var(--color-text-secondary)]" size={16} weight="bold" /> : null}
      </button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="그룹 전환">
        <div className="grid gap-3" role="listbox">
          {families.length > 0 ? (
            <SegmentedControl
              onChange={setGroupTab}
              options={[
                { label: `오너 그룹 ${ownerFamilies.length}`, value: "OWNER" },
                { label: `그룹원 그룹 ${memberFamilies.length}`, value: "MEMBER" },
              ]}
              value={visibleGroupTab}
            />
          ) : null}
          {families.length === 0 ? (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              아직 참여 중인 그룹이 없습니다.
            </p>
          ) : null}
          {families.length > 0 && visibleFamilies.length === 0 ? (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              {visibleGroupTab === "OWNER" ? "내가 오너인 그룹이 없습니다." : "그룹원으로 참여 중인 그룹이 없습니다."}
            </p>
          ) : null}
          {visibleFamilies.map((family) => (
            <BottomSheetItem
              aria-selected={family.id === activeFamilyId}
              active={family.id === activeFamilyId}
              key={family.id}
              onClick={() => {
                onSelect(family.id);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              <span className="min-w-0 truncate">{family.name}</span>
              <span className="ml-auto shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]">
                {visibleGroupTab === "OWNER" ? "오너" : "그룹원"}
              </span>
              {family.id === activeFamilyId ? <Check className="shrink-0 text-brand" size={18} weight="bold" /> : null}
            </BottomSheetItem>
          ))}
          <div className="border-t border-[var(--color-border)] pt-3">
            <Button
              className="w-full"
              onClick={() => {
                setIsOpen(false);
                onCreateFamily();
              }}
              type="button"
            >
              <UsersThree size={18} weight="bold" />
              그룹 생성하기
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function truncateFamilyName(name: string) {
  const characters = Array.from(name);

  return characters.length > 8 ? `${characters.slice(0, 8).join("")}...` : name;
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
