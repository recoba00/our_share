import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ToastProvider } from "../components/common/Toast";
import { AppLayout } from "../components/layout/AppLayout";
import { PwaPrompt } from "../components/pwa/PwaPrompt";
import { AuthProvider } from "../features/auth/AuthProvider";
import { FamilyProvider } from "../features/family/FamilyProvider";

const CalendarPage = lazy(() =>
  import("../pages/calendar/CalendarPage").then(({ CalendarPage: page }) => ({ default: page }))
);
const ChatPage = lazy(() =>
  import("../pages/chat/ChatPage").then(({ ChatPage: page }) => ({ default: page }))
);
const DiagnosticsPage = lazy(() =>
  import("../pages/diagnostics/DiagnosticsPage").then(({ DiagnosticsPage: page }) => ({ default: page }))
);
const HomePage = lazy(() =>
  import("../pages/home/HomePage").then(({ HomePage: page }) => ({ default: page }))
);
const InvitePage = lazy(() =>
  import("../pages/invite/InvitePage").then(({ InvitePage: page }) => ({ default: page }))
);
const MemoPage = lazy(() =>
  import("../pages/memo/MemoPage").then(({ MemoPage: page }) => ({ default: page }))
);
const PollPage = lazy(() =>
  import("../pages/poll/PollPage").then(({ PollPage: page }) => ({ default: page }))
);
const ProfilePage = lazy(() =>
  import("../pages/profile/ProfilePage").then(({ ProfilePage: page }) => ({ default: page }))
);
const SettingsPage = lazy(() =>
  import("../pages/settings/SettingsPage").then(({ SettingsPage: page }) => ({ default: page }))
);

export function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            <ErrorBoundary>
              <AppLayout>
                <Suspense fallback={<RouteLoading />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/invite/:inviteCode" element={<InvitePage />} />
                    <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
                    <Route path="/chat/:roomId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                    <Route path="/poll" element={<RequireAuth><PollPage /></RequireAuth>} />
                    <Route path="/memo" element={<RequireAuth><MemoPage /></RequireAuth>} />
                    <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
                    <Route path="/diagnostics" element={<DiagnosticsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
                <PwaPrompt />
              </AppLayout>
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </ToastProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}

function RouteLoading() {
  return (
    <div className="grid min-h-[12rem] place-items-center">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">불러오는 중이에요.</p>
    </div>
  );
}
