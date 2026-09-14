import {
  CalendarBlank,
  ChatCircleDots,
  House,
  NotePencil,
  ChartBar,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "홈", icon: House },
  { to: "/chat", label: "채팅", icon: ChatCircleDots },
  { to: "/poll", label: "투표", icon: ChartBar },
  { to: "/memo", label: "메모", icon: NotePencil },
  { to: "/calendar", label: "캘린더", icon: CalendarBlank },
];

export function BottomNavigation() {
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    function handleScroll() {
      setIsScrolling(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setIsScrolling(false), 180);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[28px] border border-white/70 bg-white/75 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-300 lg:left-1/2 lg:right-auto lg:w-[720px] lg:-translate-x-1/2">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition-all duration-300 active:scale-95",
                isActive
                  ? "bg-brand-soft/90 text-brand shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:bg-white/70",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="transition-all duration-300"
                  size={22}
                  weight={isActive ? "fill" : "regular"}
                />
                <span
                  className={`overflow-hidden transition-all duration-300 ${
                    isScrolling ? "max-h-0 opacity-0" : "max-h-4 opacity-100"
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
