import {
  CalendarBlank,
  ChartBar,
  ChatCircleDots,
  House,
  NotePencil,
} from "@phosphor-icons/react";

export const mainNavigationItems = [
  { to: "/", label: "홈", icon: House },
  { to: "/chat", label: "채팅", icon: ChatCircleDots },
  { to: "/poll", label: "투표", icon: ChartBar },
  { to: "/memo", label: "메모", icon: NotePencil },
  { to: "/calendar", label: "캘린더", icon: CalendarBlank },
];
