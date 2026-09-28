import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";
import { RequireAdmin } from "../components/auth/RequireAdmin";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { ConfirmDialogProvider } from "../components/common/ConfirmDialog";
import { ToastProvider } from "../components/common/Toast";
import { AppLayout } from "../components/layout/AppLayout";
import { RequiredConsentGate } from "../components/compliance/RequiredConsentGate";
import { AccountRestrictionGate } from "../components/moderation/AccountRestrictionGate";
import { PwaPrompt } from "../components/pwa/PwaPrompt";
import { AuthProvider } from "../features/auth/AuthProvider";
import { AdminAccessProvider } from "../features/admin/AdminAccessProvider";
import { FamilyProvider } from "../features/family/FamilyProvider";
import {
  loadAdminPage,
  loadCalendarPage,
  loadChatPage,
  loadDiagnosticsPage,
  loadHomePage,
  loadInvitePage,
  loadMemoPage,
  loadPollPage,
  loadProfilePage,
  loadSettingsPage,
} from "./routeModules";

const CalendarPage = lazy(() =>
  loadCalendarPage().then(({ CalendarPage: page }) => ({ default: page }))
);
const ChatPage = lazy(() =>
  loadChatPage().then(({ ChatPage: page }) => ({ default: page }))
);
const DiagnosticsPage = lazy(() =>
  loadDiagnosticsPage().then(({ DiagnosticsPage: page }) => ({ default: page }))
);
const HomePage = lazy(() =>
  loadHomePage().then(({ HomePage: page }) => ({ default: page }))
);
const InvitePage = lazy(() =>
  loadInvitePage().then(({ InvitePage: page }) => ({ default: page }))
);
const MemoPage = lazy(() =>
  loadMemoPage().then(({ MemoPage: page }) => ({ default: page }))
);
const PollPage = lazy(() =>
  loadPollPage().then(({ PollPage: page }) => ({ default: page }))
);
const ProfilePage = lazy(() =>
  loadProfilePage().then(({ ProfilePage: page }) => ({ default: page }))
);
const SettingsPage = lazy(() =>
  loadSettingsPage().then(({ SettingsPage: page }) => ({ default: page }))
);
const AdminPage = lazy(() =>
  loadAdminPage().then(({ AdminPage: page }) => ({ default: page }))
);

export function App() {
  return (
    <AuthProvider>
      <AdminAccessProvider>
        <AccountRestrictionGate>
          <RequiredConsentGate>
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
                        <Route path="/admin" element={<RequireAuth><RequireAdmin><AdminPage /></RequireAdmin></RequireAuth>} />
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
          </RequiredConsentGate>
        </AccountRestrictionGate>
      </AdminAccessProvider>
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
