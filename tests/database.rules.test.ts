import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, set, update } from "firebase/database";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "our-share-rtdb-rules-test";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: readFileSync("database.rules.json", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearDatabase();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Realtime Database family membership mirror rules", () => {
  it("allows the first owner mirror and owner-managed member mirrors", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").database();

    await assertSucceeds(
      set(
        ref(aliceDb, "familyMembers/familyA/alice"),
        createFamilyMemberMirror("alice", "OWNER")
      )
    );
    await assertSucceeds(
      set(
        ref(aliceDb, "familyMembers/familyA/bob"),
        createFamilyMemberMirror("bob", "MEMBER")
      )
    );
  });

  it("blocks self role escalation after a family mirror exists", async () => {
    await seedFamilyMemberMirror({
      familyId: "familyA",
      role: "OWNER",
      userId: "alice",
    });

    const bobDb = testEnv.authenticatedContext("bob").database();

    await assertFails(
      set(
        ref(bobDb, "familyMembers/familyA/bob"),
        createFamilyMemberMirror("bob", "OWNER")
      )
    );
  });

  it("allows family members to read membership mirrors and blocks outsiders", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });

    const aliceDb = testEnv.authenticatedContext("alice").database();
    const outsiderDb = testEnv.authenticatedContext("outsider").database();

    await assertSucceeds(get(ref(aliceDb, "familyMembers/familyA/bob")));
    await assertFails(get(ref(outsiderDb, "familyMembers/familyA/bob")));
  });
});

describe("Realtime Database live location rules", () => {
  it("allows members to write their own valid location and read family locations", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });

    const bobDb = testEnv.authenticatedContext("bob").database();

    await assertSucceeds(
      set(ref(bobDb, "liveLocations/familyA/bob"), createLiveLocation())
    );
    await assertSucceeds(get(ref(bobDb, "liveLocations/familyA")));
  });

  it("blocks live location access without a membership mirror", async () => {
    const outsiderDb = testEnv.authenticatedContext("outsider").database();

    await assertFails(
      set(ref(outsiderDb, "liveLocations/familyA/outsider"), createLiveLocation())
    );
    await assertFails(get(ref(outsiderDb, "liveLocations/familyA")));
  });

  it("blocks writing another user's location", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });

    const bobDb = testEnv.authenticatedContext("bob").database();

    await assertFails(
      set(ref(bobDb, "liveLocations/familyA/alice"), createLiveLocation())
    );
  });

  it("blocks invalid location payloads", async () => {
    await seedFamilyMemberMirror({
      familyId: "familyA",
      role: "OWNER",
      userId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").database();

    await assertFails(
      set(ref(aliceDb, "liveLocations/familyA/alice"), {
        ...createLiveLocation(),
        latitude: 120,
      })
    );
    await assertFails(
      update(ref(aliceDb, "liveLocations/familyA/alice"), {
        latitude: 37.5665,
      })
    );
  });
});

async function seedFamilyMembersMirror({
  familyId,
  members,
}: {
  familyId: string;
  members: Array<[string, "OWNER" | "PARENT" | "MEMBER" | "CHILD"]>;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.database();

    for (const [userId, role] of members) {
      await set(
        ref(db, `familyMembers/${familyId}/${userId}`),
        createFamilyMemberMirror(userId, role)
      );
    }
  });
}

async function seedFamilyMemberMirror({
  familyId,
  role,
  userId,
}: {
  familyId: string;
  role: "OWNER" | "PARENT" | "MEMBER" | "CHILD";
  userId: string;
}) {
  await seedFamilyMembersMirror({
    familyId,
    members: [[userId, role]],
  });
}

function createFamilyMemberMirror(
  userId: string,
  role: "OWNER" | "PARENT" | "MEMBER" | "CHILD"
) {
  return {
    role,
    updatedAt: Date.now(),
    userId,
  };
}

function createLiveLocation() {
  return {
    accuracy: null,
    battery: null,
    charging: null,
    latitude: 37.5665,
    longitude: 126.978,
    updatedAt: Date.now(),
  };
}
