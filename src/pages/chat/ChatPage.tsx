import { LockKey, PaperPlaneTilt, UserPlus } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  createSecretRoom,
  getOrCreateFamilyRoom,
  sendTextMessage,
  subscribeChatRooms,
  subscribeMessages,
} from "../../features/chat/services/chatService";
import type { ChatMessage, ChatRoom } from "../../features/chat/types/chatTypes";
import { getFirstFamilyForUser } from "../../features/family/services/familyService";

export function ChatPage() {
  const { user } = useAuth();
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [secretRoomName, setSecretRoomName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;
    const userId = user.uid;

    async function loadFamily() {
      const family = await getFirstFamilyForUser(userId);

      if (!active) {
        return;
      }

      setActiveFamily(family);

      if (family) {
        const familyRoomId = await getOrCreateFamilyRoom({
          createdBy: userId,
          familyId: family.id,
        });

        if (active) {
          setSelectedRoomId(familyRoomId);
        }
      }
    }

    loadFamily().catch((error: Error) => setStatusMessage(error.message));

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!activeFamily || !user) {
      return;
    }

    return subscribeChatRooms({
      familyId: activeFamily.id,
      onChange: setRooms,
      userId: user.uid,
    });
  }, [activeFamily, user]);

  useEffect(() => {
    if (!selectedRoom) {
      return;
    }

    return subscribeMessages({
      onChange: setMessages,
      roomId: selectedRoom.id,
    });
  }, [selectedRoom]);

  async function handleCreateSecretRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !user) {
      return;
    }

    try {
      const roomId = await createSecretRoom({
        createdBy: user.uid,
        familyId: activeFamily.id,
        name: secretRoomName,
      });
      setSecretRoomName("");
      setSelectedRoomId(roomId);
      setStatusMessage("비밀방을 만들었어요.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "비밀방 생성에 실패했습니다.");
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeFamily || !selectedRoom || !user) {
      return;
    }

    try {
      await sendTextMessage({
        createdBy: user.uid,
        familyId: activeFamily.id,
        roomId: selectedRoom.id,
        text: messageText,
      });
      setMessageText("");
      setStatusMessage("");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "메시지 전송에 실패했습니다.");
    }
  }

  if (!activeFamily) {
    return (
      <Card>
        <h2 className="text-xl font-black">채팅</h2>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          홈에서 가족을 만들거나 초대 코드로 참여하면 채팅방을 사용할 수 있어요.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <h2 className="text-xl font-black">채팅</h2>
        <div className="mt-4 rounded-2xl bg-[var(--color-surface-muted)] p-4">
          <div className="flex items-center gap-2 text-sm font-bold">
            <UserPlus size={18} weight="bold" />
            가족 초대 코드
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-brand">
            {activeFamily.inviteCode}
          </p>
        </div>

        <form className="mt-4 grid gap-2" onSubmit={handleCreateSecretRoom}>
          <Input
            label="비밀방 이름"
            onChange={(event) => setSecretRoomName(event.target.value)}
            placeholder="예: 선물 작전방"
            value={secretRoomName}
          />
          <Button type="submit" variant="secondary">
            <LockKey size={18} weight="bold" />
            비밀방 만들기
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {rooms.map((room) => (
            <button
              className={`w-full rounded-2xl p-4 text-left transition ${
                selectedRoom?.id === room.id
                  ? "bg-emerald-50 ring-2 ring-brand"
                  : "bg-[var(--color-surface-muted)] hover:bg-slate-200"
              }`}
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              type="button"
            >
              <strong>{room.name}</strong>
              <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                {room.lastMessageText ?? "아직 대화가 없습니다."}
              </p>
            </button>
          ))}
        </div>

        {statusMessage ? (
          <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {statusMessage}
          </p>
        ) : null}
      </Card>

      <Card className="min-h-[520px]">
        <h3 className="text-lg font-bold">{selectedRoom?.name ?? "채팅방"}</h3>
        <div className="mt-4 flex min-h-[360px] flex-col justify-end gap-3 rounded-2xl bg-slate-50 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              첫 메시지를 보내 가족 대화를 시작해보세요.
            </p>
          ) : (
            messages.map((message) => {
              const isMine = message.createdBy === user?.uid;

              return (
                <div
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  key={message.id}
                >
                  <p
                    className={`max-w-[280px] rounded-2xl p-3 text-sm shadow-sm ${
                      isMine ? "bg-brand text-white" : "bg-white"
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
        <form className="mt-4 flex gap-2" onSubmit={handleSendMessage}>
          <input
            className="h-11 flex-1 rounded-xl border border-[var(--color-border)] px-4 text-sm outline-none focus:border-brand"
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="메시지 입력"
            value={messageText}
          />
          <Button disabled={!selectedRoom} type="submit">
            <PaperPlaneTilt size={18} weight="bold" />
            전송
          </Button>
        </form>
      </Card>
    </div>
  );
}
