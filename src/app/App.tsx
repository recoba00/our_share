import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";
import { AppLayout } from "../components/layout/AppLayout";
import { AuthProvider } from "../features/auth/AuthProvider";
import { CalendarPage } from "../pages/calendar/CalendarPage";
import { ChatPage } from "../pages/chat/ChatPage";
import { HomePage } from "../pages/home/HomePage";
import { MemoPage } from "../pages/memo/MemoPage";
import { PollPage } from "../pages/poll/PollPage";

export function App() {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
          <Route path="/poll" element={<RequireAuth><PollPage /></RequireAuth>} />
          <Route path="/memo" element={<RequireAuth><MemoPage /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><CalendarPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
}
