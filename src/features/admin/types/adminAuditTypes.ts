import type { Timestamp } from "firebase/firestore";
import type { PlatformAdminRole } from "./platformAdminTypes";

export type AdminAuditAction =
  | "NOTICE_CREATE"
  | "NOTICE_UPDATE"
  | "NOTICE_DELETE"
  | "REPORT_RESOLVE"
  | "REPORT_DISMISS"
  | "USER_RESTRICT"
  | "USER_RESTORE"
  | "ADMIN_ROLE_ASSIGN"
  | "ADMIN_ROLE_UPDATE"
  | "ADMIN_ROLE_REMOVE";

export type AdminAuditTargetType = "NOTICE" | "REPORT" | "USER" | "ADMIN_ROLE";

export type AdminAuditActor = {
  id: string;
  role: PlatformAdminRole;
};

export type AdminAuditLog = {
  action: AdminAuditAction;
  actorId: string;
  actorRole: PlatformAdminRole;
  createdAt: Timestamp | null;
  description: string;
  id: string;
  targetId: string;
  targetType: AdminAuditTargetType;
};

export const adminAuditActionLabels: Record<AdminAuditAction, string> = {
  ADMIN_ROLE_ASSIGN: "관리자 권한 추가",
  ADMIN_ROLE_REMOVE: "관리자 권한 해제",
  ADMIN_ROLE_UPDATE: "관리자 권한 변경",
  NOTICE_CREATE: "공지 작성",
  NOTICE_DELETE: "공지 삭제",
  NOTICE_UPDATE: "공지 수정",
  REPORT_DISMISS: "신고 종료",
  REPORT_RESOLVE: "신고 처리",
  USER_RESTORE: "이용 제한 해제",
  USER_RESTRICT: "이용 제한",
};
