export const loadCalendarPage = () => import("../pages/calendar/CalendarPage");
export const loadChatPage = () => import("../pages/chat/ChatPage");
export const loadDiagnosticsPage = () => import("../pages/diagnostics/DiagnosticsPage");
export const loadHomePage = () => import("../pages/home/HomePage");
export const loadInvitePage = () => import("../pages/invite/InvitePage");
export const loadMemoPage = () => import("../pages/memo/MemoPage");
export const loadPollPage = () => import("../pages/poll/PollPage");
export const loadProfilePage = () => import("../pages/profile/ProfilePage");
export const loadSettingsPage = () => import("../pages/settings/SettingsPage");
export const loadAdminPage = () => import("../pages/admin/AdminPage");

export function preloadPrimaryRouteModules() {
  return Promise.allSettled([
    loadChatPage(),
    loadPollPage(),
    loadMemoPage(),
    loadCalendarPage(),
    loadProfilePage(),
    loadSettingsPage(),
  ]);
}
