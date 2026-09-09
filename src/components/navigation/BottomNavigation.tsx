import {
  CalendarBlank,
  ChatCircleDots,
  House,
  NotePencil,
  ChartBar,
} from "@phosphor-icons/react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "홈", icon: House },
  { to: "/chat", label: "채팅", icon: ChatCircleDots },
  { to: "/poll", label: "투표", icon: ChartBar },
  { to: "/memo", label: "메모", icon: NotePencil },
  { to: "/calendar", label: "캘린더", icon: CalendarBlank },
];

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] lg:left-1/2 lg:w-[720px] lg:-translate-x-1/2 lg:rounded-t-card lg:border-x">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition",
                isActive
                  ? "bg-brand-soft text-brand"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]",
              ].join(" ")
            }
          >
            <Icon size={22} weight="bold" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
