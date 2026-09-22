import { useContext } from "react";
import { ChatMemberDrawerContext } from "./ChatMemberDrawerContext";

export function useChatMemberDrawer() {
  const context = useContext(ChatMemberDrawerContext);

  if (!context) {
    throw new Error("useChatMemberDrawer must be used within ChatMemberDrawerProvider");
  }

  return context;
}
