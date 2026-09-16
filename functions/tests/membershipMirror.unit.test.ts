import { describe, expect, it } from "vitest";

import { buildMembershipMirror } from "../src/membershipMirror";

describe("buildMembershipMirror", () => {
  it("builds a stable RTDB path and payload", () => {
    expect(
      buildMembershipMirror(
        { familyId: "group-a", userId: "user-a", role: "OWNER" },
        123
      )
    ).toEqual({
      path: "familyMembers/group-a/user-a",
      data: { role: "OWNER", userId: "user-a", updatedAt: 123 },
    });
  });

  it("mirrors a vice owner role", () => {
    expect(
      buildMembershipMirror(
        { familyId: "group-a", userId: "user-a", role: "VICE_OWNER" },
        123
      )
    ).toEqual({
      path: "familyMembers/group-a/user-a",
      data: { role: "VICE_OWNER", userId: "user-a", updatedAt: 123 },
    });
  });

  it("rejects incomplete or unknown membership records", () => {
    expect(buildMembershipMirror(undefined, 123)).toBeNull();
    expect(
      buildMembershipMirror(
        { familyId: "group-a", userId: "user-a", role: "ADMIN" },
        123
      )
    ).toBeNull();
    expect(
      buildMembershipMirror(
        { familyId: "group-a", userId: "user-a", role: "MEMBER" },
        Number.NaN
      )
    ).toBeNull();
  });
});
