import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { get, ref, remove, set, update } from "firebase/database";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

  it("scopes mirror writes to the owner role in each family", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });
    await seedFamilyMembersMirror({
      familyId: "familyB",
      members: [
        ["dave", "OWNER"],
        ["alice", "MEMBER"],
        ["erin", "MEMBER"],
      ],
    });

    const aliceDb = testEnv.authenticatedContext("alice").database();

    await assertSucceeds(
      set(
        ref(aliceDb, "familyMembers/familyA/erin"),
        createFamilyMemberMirror("erin", "MEMBER")
      )
    );
    await assertFails(
      set(
        ref(aliceDb, "familyMembers/familyB/erin"),
        createFamilyMemberMirror("erin", "OWNER")
      )
    );
    await assertFails(
      set(
        ref(aliceDb, "familyMembers/familyB/alice"),
        createFamilyMemberMirror("alice", "OWNER")
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

  it("allows a non-owner to leave and owner-managed member deletion", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });

    const bobDb = testEnv.authenticatedContext("bob").database();
    const aliceDb = testEnv.authenticatedContext("alice").database();

    await assertSucceeds(remove(ref(bobDb, "familyMembers/familyA/bob")));
    await assertSucceeds(remove(ref(aliceDb, "familyMembers/familyA/alice")));
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

  it("allows an owner to delete member runtime data but blocks member cleanup of others", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();

      await set(ref(db, "liveLocations/familyA/bob"), createLiveLocation());
      await set(ref(db, "onlinePresence/familyA/bob"), { status: "online" });
      await set(ref(db, "deviceStatus/familyA/bob"), { battery: 80 });
    });

    const aliceDb = testEnv.authenticatedContext("alice").database();
    const bobDb = testEnv.authenticatedContext("bob").database();

    await assertSucceeds(remove(ref(aliceDb, "liveLocations/familyA/bob")));
    await assertSucceeds(remove(ref(aliceDb, "onlinePresence/familyA/bob")));
    await assertSucceeds(remove(ref(aliceDb, "deviceStatus/familyA/bob")));
    await assertFails(remove(ref(bobDb, "liveLocations/familyA/alice")));
  });

  it("allows an owner to atomically clear crew mirrors and runtime data", async () => {
    await seedFamilyMembersMirror({
      familyId: "familyA",
      members: [
        ["alice", "OWNER"],
        ["bob", "MEMBER"],
      ],
    });
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();
      for (const userId of ["alice", "bob"]) {
        await set(ref(db, `liveLocations/familyA/${userId}`), createLiveLocation());
        await set(ref(db, `onlinePresence/familyA/${userId}`), { status: "online" });
        await set(ref(db, `deviceStatus/familyA/${userId}`), { battery: 80 });
      }
    });

    const aliceDb = testEnv.authenticatedContext("alice").database();
    const updates = Object.fromEntries(
      ["alice", "bob"].flatMap((userId) => [
        [`familyMembers/familyA/${userId}`, null],
        [`liveLocations/familyA/${userId}`, null],
        [`onlinePresence/familyA/${userId}`, null],
        [`deviceStatus/familyA/${userId}`, null],
      ])
    );

    await assertSucceeds(update(ref(aliceDb), updates));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();
      for (const path of [
        "familyMembers/familyA/alice",
        "familyMembers/familyA/bob",
        "liveLocations/familyA/alice",
        "liveLocations/familyA/bob",
        "onlinePresence/familyA/alice",
        "onlinePresence/familyA/bob",
        "deviceStatus/familyA/alice",
        "deviceStatus/familyA/bob",
      ]) {
        expect((await get(ref(db, path))).exists()).toBe(false);
      }
    });
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
