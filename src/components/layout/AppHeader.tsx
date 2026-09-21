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
  X,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/useAuth";
import { useFamily } from "../../features/family/useFamily";
import { truncateFamilyName } from "../../features/family/utils/familyName";
import { BottomSheet } from "../common/BottomSheet";
import { BottomSheetItem } from "../common/BottomSheetItem";
import { Button } from "../common/Button";
import { CreateFamilySheet } from "../common/CreateFamilySheet";
import { FamilyRoleIndicator } from "../common/FamilyRoleIndicator";
import { SegmentedControl } from "../common/SegmentedControl";
import type { Family } from "../../features/family/types/familyTypes";
import { subscribeCalendarEvents } from "../../features/calendar/services/calendarService";
import type { CalendarEvent } from "../../features/calendar/types/calendarTypes";
import { subscribeChatRooms, subscribeMessages } from "../../features/chat/services/chatService";
import type { ChatMessage, ChatRoom } from "../../features/chat/types/chatTypes";
import { subscribeMemos } from "../../features/memo/services/memoService";
import type { Memo } from "../../features/memo/types/memoTypes";
import { subscribePolls } from "../../features/poll/services/pollService";
import type { Poll } from "../../features/poll/types/pollTypes";
import { mainNavigationItems } from "../navigation/navigationItems";
import { ChatMemberDrawer } from "../chat/ChatMemberDrawer";

type LocationState = {
  chatRoomName?: string;
};

export function AppHeader() {
  const { signOut, status, user } = useAuth();
  const { activeFamily, families, selectFamily } = useFamily();
  const { pathname, state } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateFamilyOpen, setIsCreateFamilyOpen] = useState(false);
  const [notificationCalendarEvents, setNotificationCalendarEvents] = useState<CalendarEvent[]>([]);
  const [notificationPolls, setNotificationPolls] = useState<Poll[]>([]);
  const [notificationChatRooms, setNotificationChatRooms] = useState<ChatRoom[]>([]);
  const [notificationIncomingMessages, setNotificationIncomingMessages] = useState<
    Record<string, ChatMessage | null>
  >({});
  const [notificationMemos, setNotificationMemos] = useState<Memo[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [isChatMembersOpen, setIsChatMembersOpen] = useState(false);
  const locationState = state as LocationState | null;
  const title = getPageTitle(pathname);
  const isHome = title === "우리끼리";
  const isProfile = pathname.startsWith("/profile");
  const isSettings = pathname.startsWith("/settings");
  const isChatRoom = /^\/chat\/[^/]+/.test(pathname);
  const chatRoomId = isChatRoom ? pathname.split("/")[2] ?? "" : "";
  const activeFamilyId = activeFamily?.id;
  const userId = user?.uid;
  const headerIconSize = 20;

  useEffect(() => {
    if (!isChatRoom || !activeFamilyId || !userId || !chatRoomId) {
      return;
    }

    return subscribeChatRooms({
      familyId: activeFamilyId,
      onChange: (rooms) => {
        setChatRoom(rooms.find((room) => room.id === chatRoomId) ?? null);
      },
      userId,
    });
  }, [activeFamilyId, chatRoomId, isChatRoom, userId]);

  useEffect(() => {
    if (!isNotificationsOpen || !activeFamilyId || !userId) {
      return;
    }

    const unsubscribes = [
      subscribeCalendarEvents({
        familyId: activeFamilyId,
        onChange: setNotificationCalendarEvents,
        userId,
      }),
      subscribePolls({
        familyId: activeFamilyId,
        onChange: setNotificationPolls,
      }),
      subscribeChatRooms({
        familyId: activeFamilyId,
        onChange: setNotificationChatRooms,
        userId,
      }),
      subscribeMemos({
        familyId: activeFamilyId,
        onChange: setNotificationMemos,
        userId,
      }),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [activeFamilyId, isNotificationsOpen, userId]);

  useEffect(() => {
    if (!isNotificationsOpen || !activeFamilyId || !userId || notificationChatRooms.length === 0) {
      return;
    }

    const unsubscribes = notificationChatRooms.slice(0, 6).map((room) =>
      subscribeMessages({
        familyId: activeFamilyId,
        onChange: (messages) => {
          const incomingMessage = [...messages]
            .reverse()
            .find((message) => message.createdBy !== userId);

          setNotificationIncomingMessages((current) => ({
            ...current,
            [room.id]: incomingMessage ?? null,
          }));
        },
        roomId: room.id,
      })
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [activeFamilyId, isNotificationsOpen, notificationChatRooms, userId]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isNotificationsOpen]);

  return (
    <>
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
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="shrink-0 text-lg font-semibold leading-none">{title}</h1>
            </div>
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
          {status === "authenticated" && isChatRoom ? (
            <button
              aria-label="참여 멤버 보기"
              className="grid size-8 place-items-center text-[var(--color-text-secondary)] transition hover:text-brand"
              onClick={() => setIsChatMembersOpen(true)}
              type="button"
            >
              <UsersThree size={headerIconSize} weight="regular" />
            </button>
          ) : null}
          {status === "authenticated" && !isSettings ? (
            <button
              aria-label="알림"
              className="relative grid size-8 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-white/70 hover:text-[var(--color-text-primary)]"
              onClick={() => setIsNotificationsOpen((isOpen) => !isOpen)}
              type="button"
            >
              <Bell size={headerIconSize} />
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
        </div>
      </div>
      {user ? (
        <CreateFamilySheet
          isOpen={isCreateFamilyOpen}
          onClose={() => setIsCreateFamilyOpen(false)}
        />
      ) : null}
    </header>
    {isNotificationsOpen ? (
      <NotificationDrawer
        calendarEvents={notificationCalendarEvents}
        chatRooms={notificationChatRooms}
        incomingMessages={notificationIncomingMessages}
        memos={notificationMemos}
        onClose={() => setIsNotificationsOpen(false)}
        polls={notificationPolls}
      />
    ) : null}
    {isChatMembersOpen && activeFamily && user ? (
      <ChatMemberDrawer
        currentUserId={user.uid}
        currentUserRole={activeFamily.role}
        familyId={activeFamily.id}
        isOpen={isChatMembersOpen}
        onClose={() => setIsChatMembersOpen(false)}
        room={chatRoom}
      />
    ) : null}
    </>
  );
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
            ? "flex h-8 w-full max-w-full min-w-0 items-center gap-1 text-lg font-semibold leading-none transition hover:text-brand"
            : "flex h-8 w-full max-w-full min-w-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/70 px-3 text-xs font-semibold text-[var(--color-text-secondary)] transition hover:border-brand hover:text-brand"
        }
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 max-w-full truncate">
          {activeFamily ? truncateFamilyName(activeFamily.name) : "크루 선택"}
        </span>
        {compact ? <CaretDown className="shrink-0 text-[var(--color-text-secondary)]" size={16} weight="bold" /> : null}
      </button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="크루 전환">
        <div className="grid gap-3" role="listbox">
          {families.length > 0 ? (
            <SegmentedControl
              onChange={setGroupTab}
              options={[
                { label: `내 크루 ${ownerFamilies.length}`, value: "OWNER" },
                { label: `참여 크루 ${memberFamilies.length}`, value: "MEMBER" },
              ]}
              value={visibleGroupTab}
            />
          ) : null}
          {families.length === 0 ? (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              아직 참여 중인 크루가 없어요.
            </p>
          ) : null}
          {families.length > 0 && visibleFamilies.length === 0 ? (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
              {visibleGroupTab === "OWNER" ? "만든 크루가 없어요." : "참여 중인 크루가 없어요."}
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
              <FamilyRoleIndicator role={family.role} />
              <span className="min-w-0 flex-1 truncate">{truncateFamilyName(family.name)}</span>
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
              크루 생성하기
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function NotificationDrawer({
  calendarEvents,
  chatRooms,
  incomingMessages,
  memos,
  onClose,
  polls,
}: {
  calendarEvents: CalendarEvent[];
  chatRooms: ChatRoom[];
  incomingMessages: Record<string, ChatMessage | null>;
  memos: Memo[];
  onClose: () => void;
  polls: Poll[];
}) {
  return createPortal(
    <>
      <button
        aria-label="알림 닫기"
        className="fixed inset-0 z-40 cursor-default bg-slate-950/20"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="알림"
        className="fixed right-0 top-0 z-50 flex h-dvh w-[280px] max-w-[calc(100vw-24px)] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl side-panel-enter"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
          <h2 className="text-lg font-semibold">알림</h2>
          <button
            aria-label="알림 닫기"
            className="grid size-8 place-items-center text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
            onClick={onClose}
            type="button"
          >
            <X size={22} weight="regular" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid gap-4">
            <NotificationSection
              icon={<CalendarCheck size={18} weight="bold" />}
              items={calendarEvents.slice(0, 3).map((event) => ({
                description: `${formatNotificationDate(event.startDate)}${event.isDayOff ? " · 휴무" : ""}`,
                label: event.title,
                to: "/calendar",
              }))}
              title="캘린더"
            />
            <NotificationSection
              icon={<SealQuestion size={18} weight="bold" />}
              items={polls.slice(0, 3).map((poll) => ({
                description: poll.type === "DATE" ? "날짜 투표" : "일반 투표",
                label: poll.title,
                to: "/poll",
              }))}
              title="투표"
            />
            <NotificationSection
              icon={<ChatCircleDots size={18} weight="bold" />}
              items={chatRooms
                .map((room) => ({
                  message: incomingMessages[room.id],
                  room,
                }))
                .filter(({ message }) => message !== null && message !== undefined)
                .slice(0, 3)
                .map(({ message, room }) => ({
                  description: truncateNotificationText(message?.text ?? "새 메시지가 있어요."),
                  label: room.name,
                  to: "/chat",
                }))}
              title="채팅"
            />
            <NotificationSection
              icon={<NotePencil size={18} weight="bold" />}
              items={memos.slice(0, 3).map((memo) => ({
                description: memo.type === "SENSITIVE" ? "민감 메모" : "공유 메모",
                label: memo.title,
                to: "/memo",
              }))}
              title="메모"
            />
          </div>
        </div>
      </aside>
    </>,
    document.body
  );
}

function NotificationSection({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: NotificationItemData[];
  title: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 px-1">
        <span className="text-brand">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {items.map((item) => (
            <Link
              className="min-w-0 rounded-xl px-2 py-2 transition hover:bg-[var(--color-surface-muted)]"
              key={`${item.to}-${item.label}`}
              to={item.to}
            >
              <strong className="block truncate text-sm">{item.label}</strong>
              <span className="mt-0.5 block truncate text-xs text-[var(--color-text-secondary)]">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-2 px-2 text-xs text-[var(--color-text-secondary)]">새 소식이 없어요.</p>
      )}
    </section>
  );
}

type NotificationItemData = {
  description: string;
  label: string;
  to: string;
};

function formatNotificationDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-");

  if (!year || !month || !day) {
    return "일정이 있어요";
  }

  return `${month}.${day}`;
}

function truncateNotificationText(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue.length > 24
    ? `${normalizedValue.slice(0, 24)}...`
    : normalizedValue;
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
