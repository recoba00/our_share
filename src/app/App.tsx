import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";
import { Card } from "../components/common/Card";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ToastProvider } from "../components/common/Toast";
import { AppLayout } from "../components/layout/AppLayout";
import { PwaPrompt } from "../components/pwa/PwaPrompt";
import { AuthProvider } from "../features/auth/AuthProvider";

const CalendarPage = lazy(() =>
  import("../pages/calendar/CalendarPage").then((module) => ({
    default: module.CalendarPage,
  }))
);
const ChatPage = lazy(() =>
  import("../pages/chat/ChatPage").then((module) => ({
    default: module.ChatPage,
  }))
);
const DiagnosticsPage = lazy(() =>
  import("../pages/diagnostics/DiagnosticsPage").then((module) => ({
    default: module.DiagnosticsPage,
  }))
);
const HomePage = lazy(() =>
  import("../pages/home/HomePage").then((module) => ({
    default: module.HomePage,
  }))
);
const MemoPage = lazy(() =>
  import("../pages/memo/MemoPage").then((module) => ({
    default: module.MemoPage,
  }))
);
const PollPage = lazy(() =>
  import("../pages/poll/PollPage").then((module) => ({
    default: module.PollPage,
  }))
);
const ProfilePage = lazy(() =>
  import("../pages/profile/ProfilePage").then((module) => ({
    default: module.ProfilePage,
  }))
);
const SettingsPage = lazy(() =>
  import("../pages/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  }))
);

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <AppLayout>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
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
      </ToastProvider>
    </AuthProvider>
  );
}

function PageLoading() {
  return (
    <Card className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <span className="size-3 animate-pulse rounded-full bg-brand" />
        <p className="text-sm font-bold text-[var(--color-text-secondary)]">
          화면을 불러오는 중입니다.
        </p>
      </div>
    </Card>
  );
}
