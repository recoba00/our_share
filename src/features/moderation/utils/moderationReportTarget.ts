import type { ModerationReportDraft } from "../types/moderationTypes";

export type ModerationReportTarget = Pick<
  ModerationReportDraft,
  "targetLabel" | "targetType" | "targetUserId"
>;

const targetLabelLimit = 120;

export function buildUserReportTarget({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}): ModerationReportTarget {
  return {
    targetLabel: truncateTargetLabel(userName.trim() || "사용자"),
    targetType: "USER",
    targetUserId: userId,
  };
}

export function buildChatMessageReportTarget({
  messageId,
  messageText,
  roomName,
  senderId,
  senderName,
}: {
  messageId: string;
  messageText: string;
  roomName: string;
  senderId: string;
  senderName: string;
}): ModerationReportTarget {
  const normalizedMessage = messageText.replace(/\s+/g, " ").trim() || "내용 없음";
  const messagePreview = normalizedMessage.length > 48
    ? `${normalizedMessage.slice(0, 47)}...`
    : normalizedMessage;
  const shortMessageId = messageId.slice(0, 8);

  return {
    targetLabel: truncateTargetLabel(
      `${senderName.trim() || "사용자"} · ${roomName.trim() || "채팅방"} · ${messagePreview} (#${shortMessageId})`
    ),
    targetType: "CHAT",
    targetUserId: senderId,
  };
}

export function truncateTargetLabel(value: string) {
  if (value.length <= targetLabelLimit) {
    return value;
  }

  return `${value.slice(0, targetLabelLimit - 3)}...`;
}
