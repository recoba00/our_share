import { describe, expect, it } from "vitest";
import { isPlatformAdmin } from "../src/features/admin/platformAdmin";

describe("platform admin allowlist", () => {
  it("allows only the configured bootstrap administrator", () => {
    expect(isPlatformAdmin("fOMEpAePtlXUvUukUDClM4lUZC82")).toBe(true);
    expect(isPlatformAdmin("another-user")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });
});
