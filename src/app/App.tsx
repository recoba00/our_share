import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { CalendarPage } from "../pages/calendar/CalendarPage";
import { ChatPage } from "../pages/chat/ChatPage";
import { HomePage } from "../pages/home/HomePage";
import { MemoPage } from "../pages/memo/MemoPage";
import { PollPage } from "../pages/poll/PollPage";

export function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/poll" element={<PollPage />} />
        <Route path="/memo" element={<MemoPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
