import { describe, expect, it } from "vitest";
import { isPlatformAdmin } from "../src/features/admin/platformAdmin";
import { getPlatformAdminPermissions } from "../src/features/admin/types/platformAdminTypes";

describe("platform admin allowlist", () => {
  it("allows only the configured bootstrap administrator", () => {
    expect(isPlatformAdmin("fOMEpAePtlXUvUukUDClM4lUZC82")).toBe(true);
    expect(isPlatformAdmin("another-user")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });

  it("maps platform roles to least-privilege permissions", () => {
    expect(getPlatformAdminPermissions("MODERATOR")).toEqual({
      canManageAdmins: false,
      canManageModeration: true,
      canManageNotices: false,
      canViewOperations: true,
    });
    expect(getPlatformAdminPermissions("CONTENT_MANAGER").canManageNotices).toBe(true);
    expect(getPlatformAdminPermissions("VIEWER").canManageModeration).toBe(false);
    expect(getPlatformAdminPermissions("SUPER_ADMIN").canManageAdmins).toBe(true);
  });
});
