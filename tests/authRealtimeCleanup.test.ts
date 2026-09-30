import { describe, expect, it } from "vitest";
import {
  getMemberRealtimeRemovalUpdates,
  getUserSessionRealtimePaths,
} from "../src/lib/firebase/realtimeCleanup";

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

  it("removes membership and session paths together without duplicates", () => {
    const updates = getMemberRealtimeRemovalUpdates([
      { familyId: "crew-1", userId: "user-1" },
      { familyId: "crew-2", userId: "user-1" },
    ]);

    expect(Object.keys(updates)).toEqual([
      "familyMembers/crew-1/user-1",
      "liveLocations/crew-1/user-1",
      "onlinePresence/crew-1/user-1",
      "deviceStatus/crew-1/user-1",
      "familyMembers/crew-2/user-1",
      "liveLocations/crew-2/user-1",
      "onlinePresence/crew-2/user-1",
      "deviceStatus/crew-2/user-1",
    ]);
    expect(Object.values(updates).every((value) => value === null)).toBe(true);
  });
});
