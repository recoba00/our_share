import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";

const hostingOrigin = "https://our-share-6baf5.web.app";
const invalidTokenCodes = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

type NotificationAudience = {
  createdBy?: unknown;
  memberIds?: unknown;
  visibility?: unknown;
  visibleTo?: unknown;
};

export type PushMessage = {
  body: string;
  tag: string;
  title: string;
  url: string;
};

export function resolveAudienceUserIds({
  allMemberIds,
  audience,
}: {
  allMemberIds: string[];
  audience: NotificationAudience;
}) {
  const scopedMemberIds = Array.isArray(audience.memberIds) && audience.memberIds.length > 0
    ? audience.memberIds.filter(isNonEmptyString)
    : audience.visibility === "PRIVATE" && Array.isArray(audience.visibleTo)
      ? audience.visibleTo.filter(isNonEmptyString)
      : allMemberIds;

  const createdBy = isNonEmptyString(audience.createdBy) ? audience.createdBy : "";

  return Array.from(new Set(scopedMemberIds)).filter((userId) => userId !== createdBy);
}

export function buildChatPushMessage({
  roomId,
  roomName,
  text,
}: {
  roomId: string;
  roomName: string;
  text: string;
}): PushMessage {
  return {
    body: truncate(text || "새 메시지가 도착했어요."),
    tag: `chat:${roomId}`,
    title: roomName || "새 채팅",
    url: `/chat/${encodeURIComponent(roomId)}`,
  };
}

export function buildContentPushMessage({
  id,
  kind,
  sensitive = false,
  title,
}: {
  id: string;
  kind: "calendar" | "memo" | "poll";
  sensitive?: boolean;
  title: string;
}): PushMessage {
  const config = {
    calendar: { body: title, heading: "새 일정이 등록됐어요", path: "/calendar" },
    memo: {
      body: sensitive ? "민감 메모를 확인해주세요." : title,
      heading: "새 메모가 도착했어요",
      path: "/memo",
    },
    poll: { body: title, heading: "새 투표가 열렸어요", path: "/poll" },
  }[kind];

  return {
    body: truncate(config.body),
    tag: `${kind}:${id}`,
    title: config.heading,
    url: config.path,
  };
}

export async function loadFamilyMemberIds(familyId: string) {
  const snapshot = await getFirestore()
    .collection("familyMembers")
    .where("familyId", "==", familyId)
    .get();

  return snapshot.docs
    .map((memberDocument) => memberDocument.get("userId"))
    .filter(isNonEmptyString);
}

export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(isNonEmptyString)));

  if (uniqueUserIds.length === 0) {
    return { sent: 0 };
  }

  const deviceSnapshots = await Promise.all(
    uniqueUserIds.map((userId) =>
      getFirestore()
        .collection("users")
        .doc(userId)
        .collection("pushDevices")
        .where("enabled", "==", true)
        .get()
    )
  );
  const devices = deviceSnapshots.flatMap((snapshot) =>
    snapshot.docs
      .map((deviceDocument) => ({
        ref: deviceDocument.ref,
        token: deviceDocument.get("token"),
      }))
      .filter(
        (device): device is { ref: DocumentReference; token: string } =>
          isNonEmptyString(device.token)
      )
  );

  if (devices.length === 0) {
    return { sent: 0 };
  }

  let sent = 0;

  for (let offset = 0; offset < devices.length; offset += 500) {
    const chunk = devices.slice(offset, offset + 500);
    const response = await getMessaging().sendEachForMulticast({
      data: {
        body: message.body,
        tag: message.tag,
        title: message.title,
        url: message.url,
      },
      notification: {
        body: message.body,
        title: message.title,
      },
      tokens: chunk.map((device) => device.token),
      webpush: {
        fcmOptions: { link: `${hostingOrigin}${message.url}` },
        notification: {
          badge: `${hostingOrigin}/pwa-icon-192.png`,
          icon: `${hostingOrigin}/pwa-icon-192.png`,
          tag: message.tag,
        },
      },
    });

    sent += response.successCount;
    const invalidDeviceRefs = response.responses.flatMap((result, index) =>
      !result.success && result.error && invalidTokenCodes.has(result.error.code)
        ? [chunk[index].ref]
        : []
    );

    await Promise.all(invalidDeviceRefs.map((deviceRef) => deviceRef.delete()));

    if (response.failureCount > invalidDeviceRefs.length) {
      logger.warn("Some push notifications could not be delivered", {
        failures: response.failureCount,
        tag: message.tag,
      });
    }
  }

  return { sent };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function truncate(value: string) {
  const normalizedValue = value.trim();
  return normalizedValue.length > 80
    ? `${normalizedValue.slice(0, 80)}...`
    : normalizedValue;
}
