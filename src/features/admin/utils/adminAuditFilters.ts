import {
  adminAuditActionLabels,
  type AdminAuditAction,
  type AdminAuditLog,
  type AdminAuditTargetType,
} from "../types/adminAuditTypes";
import { platformAdminRoleLabels } from "../types/platformAdminTypes";

export type AdminAuditFilters = {
  action: AdminAuditAction | "ALL";
  endDate: string;
  query: string;
  startDate: string;
};

export const adminAuditTargetTypeLabels: Record<AdminAuditTargetType, string> = {
  ADMIN_ROLE: "관리자 권한",
  NOTICE: "공지",
  REPORT: "신고",
  USER: "사용자",
};

export function getDefaultAdminAuditFilters(referenceDate = new Date()): AdminAuditFilters {
  const startDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - 29
  );

  return {
    action: "ALL",
    endDate: formatDateInputValue(referenceDate),
    query: "",
    startDate: formatDateInputValue(startDate),
  };
}

export function matchesAdminAuditFilters(log: AdminAuditLog, filters: AdminAuditFilters) {
  if (filters.action !== "ALL" && log.action !== filters.action) {
    return false;
  }

  const normalizedQuery = filters.query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) {
    return true;
  }

  return [
    adminAuditActionLabels[log.action],
    platformAdminRoleLabels[log.actorRole],
    adminAuditTargetTypeLabels[log.targetType],
    log.actorId,
    log.description,
    log.targetId,
  ].some((value) => value.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
}

export function formatAdminAuditCsv(logs: AdminAuditLog[]) {
  const rows = [
    ["일시", "작업", "작업자 역할", "작업자 ID", "대상 유형", "대상 ID", "설명"],
    ...logs.map((log) => [
      formatAuditTimestamp(log),
      adminAuditActionLabels[log.action],
      platformAdminRoleLabels[log.actorRole],
      log.actorId,
      adminAuditTargetTypeLabels[log.targetType],
      log.targetId,
      log.description,
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

export function buildAdminAuditCsvFilename(referenceDate = new Date()) {
  return `our-share-audit-${formatDateInputValue(referenceDate)}.csv`;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAuditTimestamp(log: AdminAuditLog) {
  if (!log.createdAt) {
    return "";
  }

  const date = log.createdAt.toDate();
  const datePart = formatDateInputValue(date);
  const timePart = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return `${datePart} ${timePart}`;
}

function escapeCsvCell(value: string) {
  const formulaSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${formulaSafeValue.replaceAll('"', '""')}"`;
}
