import { useCallback, useMemo, useState, type PropsWithChildren } from "react";
import type { ChatRoom } from "../../features/chat/types/chatTypes";
import { ChatMemberDrawerContext } from "./ChatMemberDrawerContext";

export function ChatMemberDrawerProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false);
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(
    () => ({ close, isOpen, open, room, setRoom }),
    [close, isOpen, open, room]
  );

  return (
    <ChatMemberDrawerContext.Provider value={value}>
      {children}
    </ChatMemberDrawerContext.Provider>
  );
}
