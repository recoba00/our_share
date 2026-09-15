import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ToastProvider } from "../components/common/Toast";
import { AppLayout } from "../components/layout/AppLayout";
import { PwaPrompt } from "../components/pwa/PwaPrompt";
import { AuthProvider } from "../features/auth/AuthProvider";
import { FamilyProvider } from "../features/family/FamilyProvider";
import { CalendarPage } from "../pages/calendar/CalendarPage";
import { ChatPage } from "../pages/chat/ChatPage";
import { DiagnosticsPage } from "../pages/diagnostics/DiagnosticsPage";
import { HomePage } from "../pages/home/HomePage";
import { MemoPage } from "../pages/memo/MemoPage";
import { PollPage } from "../pages/poll/PollPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { SettingsPage } from "../pages/settings/SettingsPage";

export function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            <ErrorBoundary>
              <AppLayout>
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
                <PwaPrompt />
              </AppLayout>
            </ErrorBoundary>
          </ConfirmDialogProvider>
        </ToastProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}
