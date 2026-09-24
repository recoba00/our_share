import type { Timestamp } from "firebase/firestore";

export type ModerationReportReason =
  | "HARASSMENT"
  | "SPAM"
  | "PRIVACY"
  | "INAPPROPRIATE"
  | "OTHER";

export type ModerationReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export type ModerationTargetType = "USER" | "CHAT" | "CREW" | "CONTENT" | "OTHER";

export type ModerationReport = {
  createdAt: Timestamp | null;
  details: string;
  familyId: string | null;
  familyName: string | null;
  id: string;
  reason: ModerationReportReason;
  reporterId: string;
  reporterName: string;
  resolutionNote: string;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
  status: ModerationReportStatus;
  targetLabel: string;
  targetType: ModerationTargetType;
  targetUserId: string | null;
  updatedAt: Timestamp | null;
};

export type ModerationReportDraft = Pick<
  ModerationReport,
  "details" | "reason" | "targetLabel" | "targetType" | "targetUserId"
>;

export type UserRestrictionReason =
  | "ABUSE"
  | "HARASSMENT"
  | "SPAM"
  | "PRIVACY"
  | "OTHER";

export type UserRestriction = {
  createdAt: Timestamp | null;
  createdBy: string;
  id: string;
  note: string;
  reason: UserRestrictionReason;
  updatedAt: Timestamp | null;
  userId: string;
};

export const moderationReasonLabels: Record<ModerationReportReason, string> = {
  HARASSMENT: "괴롭힘 또는 불쾌한 행동",
  INAPPROPRIATE: "부적절한 콘텐츠",
  OTHER: "기타",
  PRIVACY: "개인정보 침해",
  SPAM: "스팸 또는 반복 홍보",
};

export const moderationTargetLabels: Record<ModerationTargetType, string> = {
  CHAT: "채팅",
  CONTENT: "게시된 내용",
  CREW: "크루",
  OTHER: "기타",
  USER: "사용자",
};

export const restrictionReasonLabels: Record<UserRestrictionReason, string> = {
  ABUSE: "서비스 악용",
  HARASSMENT: "괴롭힘",
  OTHER: "기타 운영 사유",
  PRIVACY: "개인정보 침해",
  SPAM: "스팸",
};
