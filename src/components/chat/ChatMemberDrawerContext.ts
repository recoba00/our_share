import { createContext, type Dispatch, type SetStateAction } from "react";
import type { ChatRoom } from "../../features/chat/types/chatTypes";

export type ChatMemberDrawerContextValue = {
  close: () => void;
  isOpen: boolean;
  open: () => void;
  room: ChatRoom | null;
  setRoom: Dispatch<SetStateAction<ChatRoom | null>>;
};

export const ChatMemberDrawerContext = createContext<ChatMemberDrawerContextValue | null>(null);
