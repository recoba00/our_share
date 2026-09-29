import { describe, expect, it } from "vitest";
import { getUserSessionRealtimePaths } from "../src/features/auth/utils/authRealtimeCleanup";

describe("auth realtime cleanup", () => {
  it("clears session data without deleting the membership authorization mirror", () => {
    const paths = getUserSessionRealtimePaths("crew-1", "user-1");

    expect(paths).toEqual([
      "liveLocations/crew-1/user-1",
      "onlinePresence/crew-1/user-1",
      "deviceStatus/crew-1/user-1",
    ]);
    expect(paths.some((path) => path.startsWith("familyMembers/"))).toBe(false);
  });
});
