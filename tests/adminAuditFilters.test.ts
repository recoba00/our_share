import { describe, expect, it } from "vitest";
import type { AdminAuditLog } from "../src/features/admin/types/adminAuditTypes";
import {
  formatAdminAuditCsv,
  getDefaultAdminAuditFilters,
  matchesAdminAuditFilters,
} from "../src/features/admin/utils/adminAuditFilters";

const auditLog: AdminAuditLog = {
  action: "USER_RESTRICT",
  actorId: "admin-123",
  actorRole: "MODERATOR",
  createdAt: null,
  description: "반복 신고된 사용자의 이용을 제한했어요.",
  id: "log-1",
  targetId: "user-456",
  targetType: "USER",
};

describe("admin audit filters", () => {
  it("builds a local 30-day default range", () => {
    expect(getDefaultAdminAuditFilters(new Date(2026, 8, 24))).toEqual({
      action: "ALL",
      endDate: "2026-09-24",
      query: "",
      startDate: "2026-08-26",
    });
  });

  it("searches action labels, descriptions, actors, and targets", () => {
    const baseFilters = {
      action: "ALL" as const,
      endDate: "2026-09-24",
      startDate: "2026-08-26",
    };

    expect(matchesAdminAuditFilters(auditLog, { ...baseFilters, query: "이용 제한" })).toBe(true);
    expect(matchesAdminAuditFilters(auditLog, { ...baseFilters, query: "admin-123" })).toBe(true);
    expect(matchesAdminAuditFilters(auditLog, { ...baseFilters, query: "user-456" })).toBe(true);
    expect(matchesAdminAuditFilters(auditLog, { ...baseFilters, query: "공지" })).toBe(false);
  });

  it("applies the selected action", () => {
    expect(matchesAdminAuditFilters(auditLog, {
      action: "NOTICE_CREATE",
      endDate: "",
      query: "",
      startDate: "",
    })).toBe(false);
  });

  it("escapes spreadsheet formulas and quotes in CSV output", () => {
    const csv = formatAdminAuditCsv([{
      ...auditLog,
      actorId: "=IMPORTXML(\"https://example.com\")",
      description: "따옴표 \"포함\"",
    }]);

    expect(csv).toContain("\uFEFF\"일시\"");
    expect(csv).toContain("\"'=IMPORTXML(\"\"https://example.com\"\")\"");
    expect(csv).toContain("\"따옴표 \"\"포함\"\"\"");
  });
});
