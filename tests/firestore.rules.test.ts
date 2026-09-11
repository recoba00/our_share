import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

const projectId = "our-share-rules-test";
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

describe("family membership rules", () => {
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
  role: "OWNER" | "MEMBER",
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
