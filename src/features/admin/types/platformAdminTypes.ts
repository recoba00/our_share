import type { Timestamp } from "firebase/firestore";

export type PlatformAdminRole =
  | "SUPER_ADMIN"
  | "MODERATOR"
  | "CONTENT_MANAGER"
  | "VIEWER";

export type PlatformAdminPermissions = {
  canManageAdmins: boolean;
  canManageModeration: boolean;
  canManageNotices: boolean;
  canViewOperations: boolean;
};

export type PlatformAdminAssignment = {
  createdAt: Timestamp | null;
  createdBy: string;
  id: string;
  role: PlatformAdminRole;
  updatedAt: Timestamp | null;
  userId: string;
};

export const platformAdminRoleLabels: Record<PlatformAdminRole, string> = {
  CONTENT_MANAGER: "콘텐츠 관리자",
  MODERATOR: "신고 관리자",
  SUPER_ADMIN: "최고 관리자",
  VIEWER: "조회 전용",
};

export const platformAdminRoleDescriptions: Record<PlatformAdminRole, string> = {
  CONTENT_MANAGER: "공지를 작성하고 게시 상태를 관리해요.",
  MODERATOR: "신고를 처리하고 사용자 이용을 제한할 수 있어요.",
  SUPER_ADMIN: "모든 운영 기능과 관리자 권한을 관리해요.",
  VIEWER: "대시보드와 사용자·크루 현황만 확인해요.",
};

export function getPlatformAdminPermissions(
  role: PlatformAdminRole | null
): PlatformAdminPermissions {
  return {
    canManageAdmins: role === "SUPER_ADMIN",
    canManageModeration: role === "SUPER_ADMIN" || role === "MODERATOR",
    canManageNotices: role === "SUPER_ADMIN" || role === "CONTENT_MANAGER",
    canViewOperations: role !== null,
  };
}
