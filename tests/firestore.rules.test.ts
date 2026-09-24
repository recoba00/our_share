import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const projectId = "our-share-rules-test";
const platformAdminUid = "fOMEpAePtlXUvUukUDClM4lUZC82";
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("private and public profile rules", () => {
  it("keeps email and consent private while allowing public profile reads", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", "alice"), createPrivateUser("alice"));
      await setDoc(doc(db, "publicProfiles", "alice"), createPublicProfile("alice"));
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "users", "alice")));
    await assertFails(getDoc(doc(bobDb, "users", "alice")));
    await assertFails(getDoc(doc(adminDb, "users", "alice")));
    await assertSucceeds(getDoc(doc(bobDb, "publicProfiles", "alice")));
    const profileDirectoryQuery = query(
      collection(adminDb, "publicProfiles"),
      orderBy("displayName"),
      startAt("a"),
      endAt(`a\uf8ff`),
      limit(26)
    );
    const profileDirectory = await assertSucceeds(getDocs(profileDirectoryQuery));
    const profileCount = await assertSucceeds(
      getCountFromServer(collection(adminDb, "publicProfiles"))
    );

    expect(profileDirectory.size).toBe(1);
    expect(profileCount.data().count).toBe(1);
  });

  it("blocks cross-user profile writes and schema pollution", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "users", "alice"), createPrivateUser("alice"))
    );
    await assertSucceeds(
      setDoc(doc(aliceDb, "publicProfiles", "alice"), createPublicProfile("alice"))
    );
    await assertFails(
      setDoc(doc(bobDb, "publicProfiles", "alice"), createPublicProfile("alice"))
    );
    await assertFails(
      setDoc(doc(bobDb, "publicProfiles", "bob"), {
        ...createPublicProfile("bob"),
        email: "bob@example.com",
      })
    );
  });
});

describe("service notice rules", () => {
  it("lets signed-in users query published notices but hides drafts", async () => {
    await seedServiceNotice("published", "PUBLISHED");
    await seedServiceNotice("draft", "DRAFT");

    const memberDb = testEnv.authenticatedContext("member").firestore();
    const guestDb = testEnv.unauthenticatedContext().firestore();

    const publishedQuery = query(
      collection(memberDb, "serviceNotices"),
      where("status", "==", "PUBLISHED")
    );
    const snapshot = await assertSucceeds(getDocs(publishedQuery));

    expect(snapshot.size).toBe(1);
    await assertFails(getDoc(doc(memberDb, "serviceNotices", "draft")));
    await assertFails(getDocs(collection(memberDb, "serviceNotices")));
    await assertFails(getDoc(doc(guestDb, "serviceNotices", "published")));
  });

  it("allows only the platform admin to manage valid notices", async () => {
    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();
    const memberDb = testEnv.authenticatedContext("member").firestore();
    const notice = createServiceNotice("notice-a", "DRAFT");

    await assertFails(setDoc(doc(memberDb, "serviceNotices", "notice-a"), notice));
    await assertSucceeds(setDoc(doc(adminDb, "serviceNotices", "notice-a"), notice));
    await assertSucceeds(
      updateDoc(doc(adminDb, "serviceNotices", "notice-a"), {
        status: "PUBLISHED",
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(memberDb, "serviceNotices", "notice-a"), { title: "탈취한 공지" })
    );
    await assertSucceeds(deleteDoc(doc(adminDb, "serviceNotices", "notice-a")));
  });

  it("rejects invalid notice fields and immutable-field changes", async () => {
    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();

    await assertFails(
      setDoc(doc(adminDb, "serviceNotices", "wrong-id"), createServiceNotice("another-id", "DRAFT"))
    );
    await assertFails(
      setDoc(doc(adminDb, "serviceNotices", "oversized"), {
        ...createServiceNotice("oversized", "DRAFT"),
        body: "x".repeat(2001),
      })
    );
    await assertFails(
      setDoc(doc(adminDb, "serviceNotices", "polluted"), {
        ...createServiceNotice("polluted", "DRAFT"),
        role: "ADMIN",
      })
    );
    await assertFails(
      setDoc(doc(adminDb, "serviceNotices", "unpublished"), {
        ...createServiceNotice("unpublished", "PUBLISHED"),
        publishedAt: null,
      })
    );

    await assertSucceeds(
      setDoc(doc(adminDb, "serviceNotices", "notice-b"), createServiceNotice("notice-b", "DRAFT"))
    );
    await assertFails(
      updateDoc(doc(adminDb, "serviceNotices", "notice-b"), {
        createdBy: "another-user",
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      updateDoc(doc(adminDb, "serviceNotices", "notice-b"), {
        createdAt: new Date(0),
        updatedAt: serverTimestamp(),
      })
    );
  });
});

describe("moderation and user restriction rules", () => {
  it("lets a signed-in user submit a private report and lets only the admin review it", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();
    const reportId = "report-a";
    const report = createModerationReport(reportId, "alice");
    const submit = writeBatch(aliceDb);
    submit.set(doc(aliceDb, "moderationReports", reportId), report);
    submit.set(doc(aliceDb, "moderationReportQueue", reportId), report);

    await assertSucceeds(submit.commit());
    await assertSucceeds(getDoc(doc(aliceDb, "moderationReports", reportId)));
    await assertFails(getDoc(doc(bobDb, "moderationReports", reportId)));
    await assertFails(getDocs(collection(bobDb, "moderationReportQueue")));

    const queue = await assertSucceeds(
      getDocs(
        query(
          collection(adminDb, "moderationReportQueue"),
          orderBy("createdAt", "desc"),
          limit(26)
        )
      )
    );
    expect(queue.size).toBe(1);

    const resolve = writeBatch(adminDb);
    resolve.update(doc(adminDb, "moderationReports", reportId), {
      resolutionNote: "확인하고 처리함",
      reviewedAt: serverTimestamp(),
      reviewedBy: platformAdminUid,
      status: "RESOLVED",
      updatedAt: serverTimestamp(),
    });
    resolve.delete(doc(adminDb, "moderationReportQueue", reportId));
    await assertSucceeds(resolve.commit());

    expect((await getDoc(doc(adminDb, "moderationReports", reportId))).data()?.status).toBe("RESOLVED");
    expect((await getDoc(doc(adminDb, "moderationReportQueue", reportId))).exists()).toBe(false);
  });

  it("blocks report impersonation, direct queue writes, and schema pollution", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const report = createModerationReport("report-b", "bob");

    await assertFails(setDoc(doc(aliceDb, "moderationReports", "report-b"), report));
    await assertFails(
      setDoc(doc(aliceDb, "moderationReportQueue", "report-b"), {
        ...createModerationReport("report-b", "alice"),
        role: "ADMIN",
      })
    );
  });

  it("lets the admin restrict access while preserving the user's own restriction read", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "publicProfiles", "alice"), createPublicProfile("alice"));
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();

    await assertSucceeds(
      setDoc(
        doc(adminDb, "userRestrictions", "alice"),
        createUserRestriction("alice")
      )
    );
    await assertSucceeds(getDoc(doc(aliceDb, "userRestrictions", "alice")));
    await assertFails(getDoc(doc(bobDb, "userRestrictions", "alice")));
    await assertFails(getDoc(doc(aliceDb, "publicProfiles", "alice")));
    await assertFails(
      setDoc(
        doc(adminDb, "userRestrictions", platformAdminUid),
        createUserRestriction(platformAdminUid)
      )
    );

    await assertSucceeds(deleteDoc(doc(adminDb, "userRestrictions", "alice")));
    await assertSucceeds(getDoc(doc(aliceDb, "publicProfiles", "alice")));
  });
});

describe("platform admin role and audit rules", () => {
  it("lets the bootstrap admin assign scoped roles while blocking self escalation", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "publicProfiles", "moderator"), createPublicProfile("moderator"));
      await setDoc(doc(db, "publicProfiles", "viewer"), createPublicProfile("viewer"));
    });

    const bootstrapDb = testEnv.authenticatedContext(platformAdminUid).firestore();
    const moderatorDb = testEnv.authenticatedContext("moderator").firestore();
    const viewerDb = testEnv.authenticatedContext("viewer").firestore();

    await assertSucceeds(
      setDoc(
        doc(bootstrapDb, "platformAdminRoles", "moderator"),
        createPlatformAdminAssignment("moderator", "MODERATOR")
      )
    );
    await assertSucceeds(getDoc(doc(moderatorDb, "platformAdminRoles", "moderator")));
    await assertFails(
      updateDoc(doc(bootstrapDb, "platformAdminRoles", "moderator"), {
        createdBy: "forged-actor",
        role: "SUPER_ADMIN",
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(
      setDoc(doc(bootstrapDb, "platformAdminRoles", "viewer"), {
        ...createPlatformAdminAssignment("viewer", "VIEWER"),
        extraRole: "SUPER_ADMIN",
      })
    );
    await assertFails(
      setDoc(
        doc(viewerDb, "platformAdminRoles", "viewer"),
        createPlatformAdminAssignment("viewer", "SUPER_ADMIN", "viewer")
      )
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "userRestrictions", "viewer"),
        createUserRestriction("viewer")
      );
    });
    await assertFails(
      setDoc(
        doc(bootstrapDb, "platformAdminRoles", "viewer"),
        createPlatformAdminAssignment("viewer", "VIEWER")
      )
    );
    await assertFails(
      setDoc(
        doc(bootstrapDb, "platformAdminRoles", platformAdminUid),
        createPlatformAdminAssignment(platformAdminUid, "SUPER_ADMIN")
      )
    );
  });

  it("enforces notice, moderation, and viewer role boundaries", async () => {
    await seedPlatformAdminRole("moderator", "MODERATOR");
    await seedPlatformAdminRole("content", "CONTENT_MANAGER");
    await seedPlatformAdminRole("viewer", "VIEWER");
    await seedServiceNotice("draft-role-test", "DRAFT");

    const moderatorDb = testEnv.authenticatedContext("moderator").firestore();
    const contentDb = testEnv.authenticatedContext("content").firestore();
    const viewerDb = testEnv.authenticatedContext("viewer").firestore();

    await assertFails(
      setDoc(
        doc(moderatorDb, "serviceNotices", "moderator-notice"),
        createServiceNoticeForActor("moderator-notice", "DRAFT", "moderator")
      )
    );
    await assertSucceeds(
      setDoc(
        doc(contentDb, "serviceNotices", "content-notice"),
        createServiceNoticeForActor("content-notice", "DRAFT", "content")
      )
    );
    await assertFails(
      setDoc(
        doc(viewerDb, "serviceNotices", "viewer-notice"),
        createServiceNoticeForActor("viewer-notice", "DRAFT", "viewer")
      )
    );
    await assertSucceeds(getDocs(collection(viewerDb, "families")));
    await assertFails(getDocs(collection(viewerDb, "moderationReportQueue")));
  });

  it("keeps audit logs immutable and rejects forged roles or actions", async () => {
    await seedPlatformAdminRole("content", "CONTENT_MANAGER");
    const contentDb = testEnv.authenticatedContext("content").firestore();
    const bootstrapDb = testEnv.authenticatedContext(platformAdminUid).firestore();

    await assertSucceeds(
      setDoc(
        doc(contentDb, "adminAuditLogs", "log-a"),
        createAdminAuditLog("log-a", "content", "CONTENT_MANAGER", "NOTICE_CREATE", "NOTICE")
      )
    );
    await assertFails(
      setDoc(
        doc(contentDb, "adminAuditLogs", "log-b"),
        createAdminAuditLog("log-b", "content", "SUPER_ADMIN", "NOTICE_CREATE", "NOTICE")
      )
    );
    await assertFails(
      setDoc(
        doc(contentDb, "adminAuditLogs", "log-c"),
        createAdminAuditLog("log-c", "content", "CONTENT_MANAGER", "USER_RESTRICT", "USER")
      )
    );
    await assertFails(
      setDoc(doc(contentDb, "adminAuditLogs", "log-polluted"), {
        ...createAdminAuditLog("log-polluted", "content", "CONTENT_MANAGER", "NOTICE_CREATE", "NOTICE"),
        role: "SUPER_ADMIN",
      })
    );
    await assertFails(updateDoc(doc(contentDb, "adminAuditLogs", "log-a"), { description: "변조" }));
    await assertFails(deleteDoc(doc(contentDb, "adminAuditLogs", "log-a")));
    await assertSucceeds(getDocs(collection(bootstrapDb, "adminAuditLogs")));
    await assertFails(getDocs(collection(contentDb, "adminAuditLogs")));
  });
});

describe("family membership rules", () => {
  it("allows only the platform admin to list all crews and memberships", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    const adminDb = testEnv.authenticatedContext(platformAdminUid).firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    const crews = await assertSucceeds(getDocs(collection(adminDb, "families")));
    const memberships = await assertSucceeds(getDocs(collection(adminDb, "familyMembers")));
    const crewDirectory = await assertSucceeds(
      getDocs(
        query(
          collection(adminDb, "families"),
          orderBy("name"),
          startAt("테"),
          endAt(`테\uf8ff`),
          limit(26)
        )
      )
    );
    const crewCount = await assertSucceeds(
      getCountFromServer(collection(adminDb, "families"))
    );
    const membershipCount = await assertSucceeds(
      getCountFromServer(collection(adminDb, "familyMembers"))
    );

    expect(crews.size).toBe(1);
    expect(memberships.size).toBe(2);
    expect(crewDirectory.size).toBe(1);
    expect(crewCount.data().count).toBe(1);
    expect(membershipCount.data().count).toBe(2);
    await assertFails(getDocs(collection(outsiderDb, "families")));
    await assertFails(getDocs(collection(outsiderDb, "familyMembers")));
    await assertFails(getCountFromServer(collection(outsiderDb, "families")));
    await assertFails(getCountFromServer(collection(outsiderDb, "familyMembers")));
  });

  it("allows owner bootstrap and invite-code member join", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "families", "familyA"), createFamily("familyA", "alice"))
    );
    await assertSucceeds(
      setDoc(
        doc(aliceDb, "familyInvites", "ABC123"),
        createFamilyInvite("familyA", "ABC123", "alice")
      )
    );
    await assertSucceeds(
      setDoc(
        doc(aliceDb, "familyMembers", "familyA_alice"),
        createFamilyMember("familyA", "alice", "OWNER")
      )
    );
    await assertSucceeds(
      setDoc(
        doc(bobDb, "familyMembers", "familyA_bob"),
        createFamilyMember("familyA", "bob", "MEMBER", "ABC123")
      )
    );
  });

  it("allows only the family owner to delete the invite index", async () => {
    await seedFamily({
      familyId: "familyA",
      inviteCode: "ABC123",
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(deleteDoc(doc(bobDb, "familyInvites", "ABC123")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "familyInvites", "ABC123")));
  });

  it("blocks arbitrary self-joining without a matching invite index", async () => {
    await seedFamily({
      familyId: "familyA",
      inviteCode: "ABC123",
      ownerId: "alice",
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      setDoc(
        doc(bobDb, "familyMembers", "familyA_bob"),
        createFamilyMember("familyA", "bob", "MEMBER")
      )
    );
    await assertFails(
      setDoc(
        doc(bobDb, "familyMembers", "familyA_bob"),
        createFamilyMember("familyA", "bob", "OWNER", "ABC123")
      )
    );
  });

  it("allows a user to query their own membership before joining", async () => {
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      getDocs(
        query(
          collection(bobDb, "familyMembers"),
          where("familyId", "==", "familyA"),
          where("userId", "==", "bob")
        )
      )
    );
  });

  it("blocks family document reads for non-members", async () => {
    await seedFamily({
      familyId: "familyA",
      inviteCode: "ABC123",
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    await assertSucceeds(getDoc(doc(aliceDb, "families", "familyA")));
    await assertFails(getDoc(doc(outsiderDb, "families", "familyA")));
  });

  it("blocks family list queries even for signed-in users", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(getDoc(doc(aliceDb, "families", "unknownFamily")));
  });

  it("allows owners to delete another family member and blocks regular members", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob", "chris"],
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(deleteDoc(doc(bobDb, "familyMembers", "familyA_chris")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "familyMembers", "familyA_chris")));
  });

  it("allows an owner to promote a member to vice owner and limits the count to two", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob", "chris", "dave"],
      ownerId: "alice",
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await updateDoc(doc(db, "families", "familyA"), {
        viceOwnerIds: ["bob", "chris"],
      });
      await updateDoc(doc(db, "familyMembers", "familyA_bob"), { role: "VICE_OWNER" });
      await updateDoc(doc(db, "familyMembers", "familyA_chris"), { role: "VICE_OWNER" });
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const promoteThirdViceOwner = writeBatch(aliceDb);
    promoteThirdViceOwner.update(doc(aliceDb, "families", "familyA"), {
      viceOwnerIds: ["bob", "chris", "dave"],
      updatedAt: new Date(),
    });
    promoteThirdViceOwner.update(doc(aliceDb, "familyMembers", "familyA_dave"), {
      role: "VICE_OWNER",
      updatedAt: new Date(),
    });

    await assertFails(promoteThirdViceOwner.commit());
  });

  it("transfers ownership, updates the invite owner, and lets the new owner delete the family", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const transfer = writeBatch(aliceDb);
    transfer.update(doc(aliceDb, "families", "familyA"), {
      ownerId: "bob",
      viceOwnerIds: ["alice"],
      updatedAt: new Date(),
    });
    transfer.update(doc(aliceDb, "familyMembers", "familyA_alice"), {
      role: "VICE_OWNER",
      updatedAt: new Date(),
    });
    transfer.update(doc(aliceDb, "familyMembers", "familyA_bob"), {
      role: "OWNER",
      updatedAt: new Date(),
    });
    transfer.update(doc(aliceDb, "familyInvites", "ABC123"), {
      ownerId: "bob",
    });

    await assertSucceeds(transfer.commit());

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const deleteFamily = writeBatch(bobDb);
    deleteFamily.delete(doc(bobDb, "familyMembers", "familyA_alice"));
    deleteFamily.delete(doc(bobDb, "familyMembers", "familyA_bob"));
    deleteFamily.delete(doc(bobDb, "families", "familyA"));
    deleteFamily.delete(doc(bobDb, "familyInvites", "ABC123"));

    await assertSucceeds(deleteFamily.commit());
  });

  it("does not allow a vice owner to delete the family", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await updateDoc(doc(db, "familyMembers", "familyA_bob"), { role: "VICE_OWNER" });
      await updateDoc(doc(db, "families", "familyA"), { viceOwnerIds: ["bob"] });
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    await assertFails(deleteDoc(doc(bobDb, "families", "familyA")));
  });

  it("allows owners to delete the family and all membership documents in one batch", async () => {
    const memberIds = [
      "alice",
      ...Array.from({ length: 12 }, (_, index) => `member${index}`),
    ];

    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds,
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const members = await getDocs(
      query(collection(aliceDb, "familyMembers"), where("familyId", "==", "familyA"))
    );
    const batch = writeBatch(aliceDb);

    members.docs.forEach((member) => batch.delete(member.ref));
    batch.delete(doc(aliceDb, "families", "familyA"));
    batch.delete(doc(aliceDb, "familyInvites", "ABC123"));

    await assertSucceeds(batch.commit());
  });

  it("allows an owner to remove a vice owner and update the role index atomically", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await updateDoc(doc(db, "familyMembers", "familyA_bob"), { role: "VICE_OWNER" });
      await updateDoc(doc(db, "families", "familyA"), { viceOwnerIds: ["bob"] });
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const batch = writeBatch(aliceDb);
    batch.delete(doc(aliceDb, "familyMembers", "familyA_bob"));
    batch.update(doc(aliceDb, "families", "familyA"), {
      viceOwnerIds: [],
      updatedAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      expect((await getDoc(doc(db, "familyMembers", "familyA_bob"))).exists()).toBe(false);
      expect((await getDoc(doc(db, "families", "familyA"))).data()?.viceOwnerIds).toEqual([]);
    });
  });

  it("uses family ownerId when the owner membership role is stale", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "familyMembers", "familyA_alice"), {
        role: "MEMBER",
      });
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const members = await getDocs(
      query(collection(aliceDb, "familyMembers"), where("familyId", "==", "familyA"))
    );
    const batch = writeBatch(aliceDb);
    members.docs.forEach((member) => batch.delete(member.ref));
    batch.delete(doc(aliceDb, "families", "familyA"));
    batch.delete(doc(aliceDb, "familyInvites", "ABC123"));

    await assertSucceeds(batch.commit());
  });

  it("scopes owner permissions to the selected family", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedFamilyWithMembers({
      familyId: "familyB",
      inviteCode: "XYZ789",
      memberIds: ["dave", "alice", "erin"],
      ownerId: "dave",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      updateDoc(doc(aliceDb, "familyMembers", "familyA_bob"), {
        role: "PARENT",
        updatedAt: new Date(),
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, "familyMembers", "familyB_erin"), {
        role: "PARENT",
        updatedAt: new Date(),
      })
    );
    await assertFails(deleteDoc(doc(aliceDb, "familyMembers", "familyB_erin")));
    await assertFails(
      updateDoc(doc(aliceDb, "familyMembers", "familyA_alice"), {
        role: "PARENT",
        updatedAt: new Date(),
      })
    );
    await assertFails(
      updateDoc(doc(aliceDb, "familyMembers", "familyA_bob"), {
        role: "OWNER",
        updatedAt: new Date(),
      })
    );
  });
});

describe("chat message rules", () => {
  it("allows room members to send messages and blocks outsiders", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedChatRoom({
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomA",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    await assertSucceeds(
      setDoc(
        doc(aliceDb, "messages", "messageA"),
        createMessage({
          createdBy: "alice",
          familyId: "familyA",
          messageId: "messageA",
          roomId: "roomA",
          text: "안녕",
        })
      )
    );
    await assertFails(
      setDoc(
        doc(outsiderDb, "messages", "messageB"),
        createMessage({
          createdBy: "outsider",
          familyId: "familyA",
          messageId: "messageB",
          roomId: "roomA",
          text: "침입 메시지",
        })
      )
    );
  });

  it("allows readBy updates but blocks message content mutation", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedChatRoom({
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomA",
    });
    await seedMessage({
      createdBy: "alice",
      familyId: "familyA",
      messageId: "messageA",
      roomId: "roomA",
      text: "원본 메시지",
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const messageRef = doc(bobDb, "messages", "messageA");

    await assertSucceeds(updateDoc(messageRef, { readBy: ["alice", "bob"] }));
    await assertFails(updateDoc(messageRef, { text: "변조 메시지" }));
  });

  it("blocks chat room member list mutation through room update", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedChatRoom({
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomA",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertFails(
      updateDoc(doc(aliceDb, "chatRooms", "roomA"), {
        memberIds: ["alice", "bob", "outsider"],
      })
    );
  });

  it("allows only the family owner to remove a member from a nested private chat room", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob", "chris"],
      ownerId: "alice",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: ["alice", "bob", "chris"],
      roomId: "privateRoom",
      type: "PRIVATE_GROUP",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const roomRef = doc(aliceDb, "families", "familyA", "chatRooms", "privateRoom");

    await assertSucceeds(updateDoc(roomRef, {
      memberIds: ["alice", "bob"],
      updatedAt: new Date(),
    }));
    await assertFails(updateDoc(doc(bobDb, "families", "familyA", "chatRooms", "privateRoom"), {
      memberIds: ["alice"],
      updatedAt: new Date(),
    }));
  });

  it("allows creators to edit and delete nested text messages only", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomA",
      type: "PRIVATE_GROUP",
    });
    await seedNestedMessage({
      createdBy: "alice",
      familyId: "familyA",
      messageId: "messageA",
      roomId: "roomA",
      text: "원본 메시지",
    });
    await seedNestedMessage({
      createdBy: "alice",
      familyId: "familyA",
      messageId: "messageB",
      roomId: "roomA",
      text: "삭제할 메시지",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      updateDoc(doc(bobDb, "families", "familyA", "messages", "messageA"), {
        text: "다른 사람이 바꾼 메시지",
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(aliceDb, "families", "familyA", "messages", "messageA"), {
        text: "수정한 메시지",
        updatedAt: serverTimestamp(),
      })
    );
    await assertFails(deleteDoc(doc(bobDb, "families", "familyA", "messages", "messageB")));
    await assertSucceeds(
      deleteDoc(doc(aliceDb, "families", "familyA", "messages", "messageB"))
    );
  });
});

describe("poll vote rules", () => {
  it("allows voting on own vote document and blocks impersonation", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedPoll({
      createdBy: "alice",
      familyId: "familyA",
      pollId: "pollA",
    });

    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertSucceeds(
      setDoc(doc(bobDb, "pollVotes", "pollA_bob"), {
        pollId: "pollA",
        userId: "bob",
        selectedOptions: ["찬성"],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    await assertFails(
      setDoc(doc(bobDb, "pollVotes", "pollA_alice"), {
        pollId: "pollA",
        userId: "alice",
        selectedOptions: ["반대"],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  });

  it("allows only the poll creator to remove votes when deleting their poll", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedNestedPoll({
      createdBy: "alice",
      familyId: "familyA",
      pollId: "pollA",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();
    const voteRef = doc(bobDb, "families", "familyA", "pollVotes", "pollA_bob");

    await assertSucceeds(
      setDoc(voteRef, {
        pollId: "pollA",
        userId: "bob",
        selectedOptions: ["가능"],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    await assertFails(deleteDoc(voteRef));

    const deleteBatch = writeBatch(aliceDb);
    deleteBatch.delete(doc(aliceDb, "families", "familyA", "pollVotes", "pollA_bob"));
    deleteBatch.delete(doc(aliceDb, "families", "familyA", "polls", "pollA"));
    await assertSucceeds(deleteBatch.commit());
  });
});

describe("MVP create flows", () => {
  it("allows family members to create calendar events, memos, polls, and chat rooms", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      setDoc(doc(aliceDb, "families", "familyA", "calendarEvents", "eventA"), {
        id: "eventA",
        familyId: "familyA",
        title: "가족 일정",
        description: "",
        startDate: "2026-09-11",
        endDate: "2026-09-11",
        allDay: true,
        category: "FAMILY",
        repeat: "NONE",
        isDayOff: false,
        createdBy: "alice",
        visibleTo: [],
        visibility: "FAMILY",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(aliceDb, "families", "familyA", "memos", "memoA"), {
        id: "memoA",
        familyId: "familyA",
        title: "가족 메모",
        content: "메모 내용",
        type: "PUBLIC",
        createdBy: "alice",
        visibleTo: [],
        visibility: "FAMILY",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        encryptedContent: null,
        encryptionIv: null,
        encryptionSalt: null,
      })
    );

    await assertSucceeds(
      setDoc(doc(aliceDb, "families", "familyA", "polls", "pollA"), {
        id: "pollA",
        familyId: "familyA",
        chatRoomId: null,
        title: "가족 투표",
        description: "",
        type: "GENERAL",
        options: ["찬성", "반대"],
        multipleChoice: false,
        anonymous: false,
        closesAt: null,
        resultVisibility: "ALWAYS",
        createdBy: "alice",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    await assertSucceeds(
      setDoc(doc(aliceDb, "families", "familyA", "chatRooms", "familyA_family"), {
        id: "familyA_family",
        familyId: "familyA",
        type: "FAMILY",
        name: "가족 전체방",
        memberIds: [],
        createdBy: "alice",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageText: null,
        lastMessageAt: null,
      })
    );
  });
});

describe("MVP family list queries", () => {
  it("allows family members to check deterministic chat room documents before creating them", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    await assertSucceeds(
      getDoc(doc(aliceDb, "families", "familyA", "chatRooms", "familyA_family"))
    );
    await assertSucceeds(
      getDoc(doc(aliceDb, "families", "familyA", "chatRooms", "familyA_direct_alice_bob"))
    );
    await assertFails(
      getDoc(doc(outsiderDb, "families", "familyA", "chatRooms", "familyA_family"))
    );
  });

  it("allows the app's familyId list queries after writes", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedNestedCalendarEvent({
      createdBy: "alice",
      eventId: "eventA",
      familyId: "familyA",
      visibility: "FAMILY",
    });
    await seedNestedCalendarEvent({
      createdBy: "alice",
      eventId: "eventPrivate",
      familyId: "familyA",
      visibility: "PRIVATE",
      visibleTo: ["alice"],
    });
    await seedNestedMemo({
      createdBy: "alice",
      familyId: "familyA",
      memoId: "memoA",
      visibility: "FAMILY",
    });
    await seedNestedMemo({
      createdBy: "alice",
      familyId: "familyA",
      memoId: "memoPrivate",
      visibility: "PRIVATE",
      visibleTo: ["alice"],
    });
    await seedNestedPoll({
      createdBy: "alice",
      familyId: "familyA",
      pollId: "pollA",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: ["alice"],
      roomId: "roomA",
      type: "PRIVATE_GROUP",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: [],
      roomId: "familyRoom",
      type: "FAMILY",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();

    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "calendarEvents"),
          where("visibility", "==", "FAMILY")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "calendarEvents"),
          where("visibility", "==", "PRIVATE"),
          where("visibleTo", "array-contains", "alice")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "memos"),
          where("visibility", "==", "FAMILY")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "memos"),
          where("visibility", "==", "PRIVATE"),
          where("visibleTo", "array-contains", "alice")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "polls"),
          orderBy("createdAt", "desc")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "chatRooms"),
          where("type", "==", "FAMILY")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "chatRooms"),
          where("createdBy", "==", "alice")
        )
      )
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(aliceDb, "families", "familyA", "chatRooms"),
          where("memberIds", "array-contains", "alice")
        )
      )
    );
  });

  it("allows creators to delete nested MVP content and blocks other family members", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice", "bob"],
      ownerId: "alice",
    });
    await seedNestedCalendarEvent({
      createdBy: "alice",
      eventId: "eventA",
      familyId: "familyA",
      visibility: "FAMILY",
    });
    await seedNestedMemo({
      createdBy: "alice",
      familyId: "familyA",
      memoId: "memoA",
      visibility: "FAMILY",
    });
    await seedNestedPoll({
      createdBy: "alice",
      familyId: "familyA",
      pollId: "pollA",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomA",
      type: "PRIVATE_GROUP",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: ["alice", "bob"],
      roomId: "roomB",
      type: "PRIVATE_GROUP",
    });

    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    const bobDb = testEnv.authenticatedContext("bob").firestore();

    await assertFails(
      deleteDoc(doc(bobDb, "families", "familyA", "calendarEvents", "eventA"))
    );
    await assertSucceeds(
      deleteDoc(doc(aliceDb, "families", "familyA", "calendarEvents", "eventA"))
    );
    await assertSucceeds(deleteDoc(doc(aliceDb, "families", "familyA", "memos", "memoA")));
    await assertSucceeds(deleteDoc(doc(aliceDb, "families", "familyA", "polls", "pollA")));
    await assertSucceeds(
      deleteDoc(doc(aliceDb, "families", "familyA", "chatRooms", "roomA"))
    );
    await assertFails(deleteDoc(doc(bobDb, "families", "familyA", "chatRooms", "roomB")));
  });

  it("blocks outsiders from app-shaped list queries", async () => {
    await seedFamilyWithMembers({
      familyId: "familyA",
      inviteCode: "ABC123",
      memberIds: ["alice"],
      ownerId: "alice",
    });
    await seedNestedCalendarEvent({
      createdBy: "alice",
      eventId: "eventA",
      familyId: "familyA",
      visibility: "FAMILY",
    });
    await seedNestedChatRoom({
      createdBy: "alice",
      familyId: "familyA",
      memberIds: [],
      roomId: "familyRoom",
      type: "FAMILY",
    });

    const outsiderDb = testEnv.authenticatedContext("outsider").firestore();

    await assertFails(
      getDocs(
        query(
          collection(outsiderDb, "families", "familyA", "calendarEvents"),
          where("visibility", "==", "FAMILY")
        )
      )
    );
    await assertFails(
      getDocs(
        query(
          collection(outsiderDb, "families", "familyA", "chatRooms"),
          where("type", "==", "FAMILY")
        )
      )
    );
  });
});

async function seedFamily({
  familyId,
  inviteCode,
  ownerId,
}: {
  familyId: string;
  inviteCode: string;
  ownerId: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "families", familyId), createFamily(familyId, ownerId));
    await setDoc(
      doc(db, "familyInvites", inviteCode),
      createFamilyInvite(familyId, inviteCode, ownerId)
    );
    await setDoc(
      doc(db, "familyMembers", `${familyId}_${ownerId}`),
      createFamilyMember(familyId, ownerId, "OWNER")
    );
  });
}

async function seedFamilyWithMembers({
  familyId,
  inviteCode,
  memberIds,
  ownerId,
}: {
  familyId: string;
  inviteCode: string;
  memberIds: string[];
  ownerId: string;
}) {
  await seedFamily({ familyId, inviteCode, ownerId });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const memberId of memberIds.filter((memberId) => memberId !== ownerId)) {
      await setDoc(
        doc(db, "familyMembers", `${familyId}_${memberId}`),
        createFamilyMember(familyId, memberId, "MEMBER", inviteCode)
      );
    }
  });
}

async function seedChatRoom({
  familyId,
  memberIds,
  roomId,
}: {
  familyId: string;
  memberIds: string[];
  roomId: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "chatRooms", roomId), {
      id: roomId,
      familyId,
      type: "PRIVATE_GROUP",
      name: "테스트방",
      memberIds,
      createdBy: memberIds[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageText: null,
      lastMessageAt: null,
    });
  });
}

async function seedMessage({
  createdBy,
  familyId,
  messageId,
  roomId,
  text,
}: {
  createdBy: string;
  familyId: string;
  messageId: string;
  roomId: string;
  text: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "messages", messageId),
      createMessage({ createdBy, familyId, messageId, roomId, text })
    );
  });
}

async function seedPoll({
  createdBy,
  familyId,
  pollId,
}: {
  createdBy: string;
  familyId: string;
  pollId: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "polls", pollId), {
      id: pollId,
      familyId,
      chatRoomId: null,
      title: "테스트 투표",
      description: "",
      type: "GENERAL",
      options: ["찬성", "반대"],
      multipleChoice: false,
      anonymous: false,
      closesAt: null,
      resultVisibility: "ALWAYS",
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function seedNestedChatRoom({
  createdBy,
  familyId,
  memberIds,
  roomId,
  type,
}: {
  createdBy: string;
  familyId: string;
  memberIds: string[];
  roomId: string;
  type: "FAMILY" | "DIRECT" | "PRIVATE_GROUP";
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "families", familyId, "chatRooms", roomId), {
      id: roomId,
      familyId,
      type,
      name: type === "FAMILY" ? "가족 전체방" : "테스트방",
      memberIds,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessageText: null,
      lastMessageAt: null,
    });
  });
}

async function seedNestedMessage({
  createdBy,
  familyId,
  messageId,
  roomId,
  text,
}: {
  createdBy: string;
  familyId: string;
  messageId: string;
  roomId: string;
  text: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "families", familyId, "messages", messageId),
      createMessage({ createdBy, familyId, messageId, roomId, text })
    );
  });
}

async function seedNestedPoll({
  createdBy,
  familyId,
  pollId,
}: {
  createdBy: string;
  familyId: string;
  pollId: string;
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "families", familyId, "polls", pollId), {
      id: pollId,
      familyId,
      chatRoomId: null,
      title: "테스트 투표",
      description: "",
      type: "GENERAL",
      options: ["찬성", "반대"],
      multipleChoice: false,
      anonymous: false,
      closesAt: null,
      resultVisibility: "ALWAYS",
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function seedNestedCalendarEvent({
  createdBy,
  eventId,
  familyId,
  visibility,
  visibleTo = [],
}: {
  createdBy: string;
  eventId: string;
  familyId: string;
  visibility: "FAMILY" | "PRIVATE";
  visibleTo?: string[];
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "families", familyId, "calendarEvents", eventId), {
      id: eventId,
      familyId,
      title: "테스트 일정",
      description: "",
      startDate: "2026-09-11",
      endDate: "2026-09-11",
      allDay: true,
      category: "FAMILY",
      repeat: "NONE",
      isDayOff: false,
      createdBy,
      visibleTo,
      visibility,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

async function seedNestedMemo({
  createdBy,
  familyId,
  memoId,
  visibility,
  visibleTo = [],
}: {
  createdBy: string;
  familyId: string;
  memoId: string;
  visibility: "FAMILY" | "PRIVATE";
  visibleTo?: string[];
}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "families", familyId, "memos", memoId), {
      id: memoId,
      familyId,
      title: "테스트 메모",
      content: "메모 내용",
      type: visibility === "FAMILY" ? "PUBLIC" : "SENSITIVE",
      createdBy,
      visibleTo,
      visibility,
      createdAt: new Date(),
      updatedAt: new Date(),
      encryptedContent: visibility === "FAMILY" ? null : "cipher",
      encryptionIv: visibility === "FAMILY" ? null : "iv",
      encryptionSalt: visibility === "FAMILY" ? null : "salt",
    });
  });
}

function createFamily(familyId: string, ownerId: string) {
  return {
    id: familyId,
    name: "테스트 가족",
    ownerId,
    inviteCode: "ABC123",
    viceOwnerIds: [],
    createdAt: new Date(),
  };
}

function createFamilyInvite(familyId: string, inviteCode: string, ownerId: string) {
  return {
    familyId,
    inviteCode,
    name: "테스트 가족",
    ownerId,
    createdAt: new Date(),
  };
}

function createFamilyMember(
  familyId: string,
  userId: string,
  role: "OWNER" | "VICE_OWNER" | "PARENT" | "MEMBER" | "CHILD",
  inviteCode?: string
) {
  return {
    familyId,
    userId,
    role,
    nickname: userId,
    relation: role === "OWNER" ? "owner" : "member",
    permissions: [],
    ...(inviteCode ? { inviteCode } : {}),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createMessage({
  createdBy,
  familyId,
  messageId,
  roomId,
  text,
}: {
  createdBy: string;
  familyId: string;
  messageId: string;
  roomId: string;
  text: string;
}) {
  return {
    id: messageId,
    familyId,
    roomId,
    type: "TEXT",
    text,
    pollId: null,
    createdBy,
    createdAt: new Date(),
    readBy: [createdBy],
  };
}

function createPrivateUser(userId: string) {
  return {
    createdAt: new Date(),
    displayName: userId,
    email: `${userId}@example.com`,
    id: userId,
    photoURL: null,
    requiredConsent: {
      consentedAt: "2026-09-23T00:00:00.000Z",
      privacy: true,
      terms: true,
      version: "2026-09-17",
    },
    updatedAt: new Date(),
  };
}

function createPublicProfile(userId: string) {
  return {
    createdAt: new Date(),
    displayName: userId,
    id: userId,
    photoURL: null,
    updatedAt: new Date(),
  };
}

function createServiceNotice(
  noticeId: string,
  status: "DRAFT" | "PUBLISHED"
) {
  return {
    body: "서비스 공지 내용",
    createdAt: serverTimestamp(),
    createdBy: platformAdminUid,
    id: noticeId,
    publishedAt: status === "PUBLISHED" ? serverTimestamp() : null,
    status,
    title: "서비스 공지",
    updatedAt: serverTimestamp(),
  };
}

function createServiceNoticeForActor(
  noticeId: string,
  status: "DRAFT" | "PUBLISHED",
  actorId: string
) {
  return {
    ...createServiceNotice(noticeId, status),
    createdBy: actorId,
  };
}

function createPlatformAdminAssignment(
  userId: string,
  role: "SUPER_ADMIN" | "MODERATOR" | "CONTENT_MANAGER" | "VIEWER",
  createdBy = platformAdminUid
) {
  return {
    createdAt: serverTimestamp(),
    createdBy,
    id: userId,
    role,
    updatedAt: serverTimestamp(),
    userId,
  };
}

function createAdminAuditLog(
  logId: string,
  actorId: string,
  actorRole: "SUPER_ADMIN" | "MODERATOR" | "CONTENT_MANAGER" | "VIEWER",
  action: string,
  targetType: string
) {
  return {
    action,
    actorId,
    actorRole,
    createdAt: serverTimestamp(),
    description: "운영 작업을 수행했어요.",
    id: logId,
    targetId: "target-a",
    targetType,
  };
}

function createModerationReport(reportId: string, reporterId: string) {
  return {
    createdAt: serverTimestamp(),
    details: "채팅에서 반복적으로 불편한 메시지를 받았어요.",
    familyId: "familyA",
    familyName: "테스트 크루",
    id: reportId,
    reason: "HARASSMENT",
    reporterId,
    reporterName: reporterId,
    resolutionNote: "",
    reviewedAt: null,
    reviewedBy: null,
    status: "OPEN",
    targetLabel: "신고 대상 사용자",
    targetType: "USER",
    targetUserId: "target-user",
    updatedAt: serverTimestamp(),
  };
}

function createUserRestriction(userId: string) {
  return {
    createdAt: serverTimestamp(),
    createdBy: platformAdminUid,
    id: userId,
    note: "운영 정책 위반 내용을 확인하고 있어요.",
    reason: "ABUSE",
    updatedAt: serverTimestamp(),
    userId,
  };
}

async function seedServiceNotice(
  noticeId: string,
  status: "DRAFT" | "PUBLISHED"
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "serviceNotices", noticeId),
      createServiceNotice(noticeId, status)
    );
  });
}

async function seedPlatformAdminRole(
  userId: string,
  role: "SUPER_ADMIN" | "MODERATOR" | "CONTENT_MANAGER" | "VIEWER"
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "publicProfiles", userId), createPublicProfile(userId));
    await setDoc(
      doc(db, "platformAdminRoles", userId),
      createPlatformAdminAssignment(userId, role)
    );
  });
}
