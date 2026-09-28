import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import { buildMembershipMirror, type FamilyMemberRecord } from "./membershipMirror";
import {
  buildChatPushMessage,
  buildContentPushMessage,
  loadFamilyMemberIds,
  resolveAudienceUserIds,
  sendPushToUsers,
} from "./pushNotifications";

initializeApp();

const familyMemberTrigger = {
  document: "familyMembers/{memberId}",
  region: "asia-northeast3" as const,
};

function toRecord(data: Record<string, unknown> | undefined): FamilyMemberRecord {
  return data ?? {};
}

async function writeMembershipMirror(data: Record<string, unknown> | undefined) {
  const mutation = buildMembershipMirror(toRecord(data));

  if (!mutation) {
    logger.warn("Skipped invalid family member mirror record", { data });
    return;
  }

  await getDatabase().ref(mutation.path).set(mutation.data);
}

async function removeMembershipMirror(data: Record<string, unknown> | undefined) {
  const mutation = buildMembershipMirror(toRecord(data));

  if (!mutation) {
    logger.warn("Skipped invalid family member mirror delete", { data });
    return;
  }

  await getDatabase().ref(mutation.path).remove();
}

export const syncFamilyMemberCreated = onDocumentCreated(
  familyMemberTrigger,
  async (event) => writeMembershipMirror(event.data?.data())
);

export const syncFamilyMemberUpdated = onDocumentUpdated(
  familyMemberTrigger,
  async (event) => writeMembershipMirror(event.data?.after.data())
);

export const syncFamilyMemberDeleted = onDocumentDeleted(
  familyMemberTrigger,
  async (event) => removeMembershipMirror(event.data?.data())
);

const crewContentTrigger = (collection: string) => ({
  document: `families/{familyId}/${collection}/{documentId}`,
  region: "asia-northeast3" as const,
});

export const notifyChatMessageCreated = onDocumentCreated(
  {
    document: "families/{familyId}/messages/{messageId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const message = event.data?.data();

    if (!message) {
      return;
    }

    const { familyId } = event.params;
    const roomId = typeof message.roomId === "string" ? message.roomId : "";

    if (!roomId) {
      return;
    }
    const roomSnapshot = await getFirestore()
      .doc(`families/${familyId}/chatRooms/${roomId}`)
      .get();

    if (!roomSnapshot.exists) {
      return;
    }

    const room = roomSnapshot.data() ?? {};
    const allMemberIds = room.type === "FAMILY"
      ? await loadFamilyMemberIds(familyId)
      : [];
    const recipients = resolveAudienceUserIds({
      allMemberIds,
      audience: {
        createdBy: String(message.createdBy ?? ""),
        memberIds: room.memberIds,
      },
    });

    await sendPushToUsers(
      recipients,
      buildChatPushMessage({
        roomId,
        roomName: String(room.name ?? "새 채팅"),
        text: String(message.text ?? "새 메시지가 도착했어요."),
      })
    );
  }
);

export const notifyCalendarEventCreated = onDocumentCreated(
  crewContentTrigger("calendarEvents"),
  async (event) => {
    const calendarEvent = event.data?.data();

    if (!calendarEvent) {
      return;
    }

    const allMemberIds = await loadFamilyMemberIds(event.params.familyId);
    const recipients = resolveAudienceUserIds({ allMemberIds, audience: calendarEvent });

    await sendPushToUsers(
      recipients,
      buildContentPushMessage({
        id: event.params.documentId,
        kind: "calendar",
        title: String(calendarEvent.title ?? "새 일정"),
      })
    );
  }
);

export const notifyPollCreated = onDocumentCreated(
  crewContentTrigger("polls"),
  async (event) => {
    const poll = event.data?.data();

    if (!poll || poll.chatRoomId) {
      return;
    }

    const allMemberIds = await loadFamilyMemberIds(event.params.familyId);
    const recipients = resolveAudienceUserIds({ allMemberIds, audience: poll });

    await sendPushToUsers(
      recipients,
      buildContentPushMessage({
        id: event.params.documentId,
        kind: "poll",
        title: String(poll.title ?? "새 투표"),
      })
    );
  }
);

export const notifyMemoCreated = onDocumentCreated(
  crewContentTrigger("memos"),
  async (event) => {
    const memo = event.data?.data();

    if (!memo) {
      return;
    }

    const allMemberIds = await loadFamilyMemberIds(event.params.familyId);
    const recipients = resolveAudienceUserIds({ allMemberIds, audience: memo });

    await sendPushToUsers(
      recipients,
      buildContentPushMessage({
        id: event.params.documentId,
        kind: "memo",
        sensitive: memo.type === "SENSITIVE",
        title: String(memo.title ?? "새 메모"),
      })
    );
  }
);
