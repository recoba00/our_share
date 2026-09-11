import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { createCalendarEvent } from "../../calendar/services/calendarService";
import {
  createSecretRoom,
  getOrCreateDirectRoom,
  getOrCreateFamilyRoom,
} from "../../chat/services/chatService";
import {
  getFamilyMembers,
  getFirstFamilyForUser,
} from "../../family/services/familyService";
import { createMemo } from "../../memo/services/memoService";
import { createPoll } from "../../poll/services/pollService";
import { db } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";

export type WriteProbeResult = {
  detail: string;
  label: string;
  ok: boolean;
};

export async function runMvpWriteProbe(userId: string): Promise<WriteProbeResult[]> {
  const family = await getFirstFamilyForUser(userId);

  if (!family) {
    return [
      {
        detail: "로그인 계정에 연결된 가족이 없습니다. 홈에서 가족 생성 또는 초대 참여가 먼저 필요합니다.",
        label: "가족 membership",
        ok: false,
      },
    ];
  }

  const results: WriteProbeResult[] = [
    {
      detail: `${family.name} / ${family.id}`,
      label: "가족 membership",
      ok: true,
    },
  ];

  await runProbeStep(results, "캘린더 저장", async () => {
    const eventId = await createCalendarEvent({
      allDay: true,
      category: "ETC",
      createdBy: userId,
      description: "진단 후 자동 삭제되는 일정입니다.",
      endDate: getToday(),
      familyId: family.id,
      isDayOff: false,
      repeat: "NONE",
      startDate: getToday(),
      title: "[진단] 저장 권한 확인",
    });

    await deleteDoc(doc(db, "families", family.id, "calendarEvents", eventId));
    return "저장 및 자동 삭제 성공";
  });

  await runProbeStep(results, "메모 저장", async () => {
    const memoId = await createMemo({
      content: "진단 후 자동 삭제되는 메모입니다.",
      createdBy: userId,
      familyId: family.id,
      password: "",
      title: "[진단] 저장 권한 확인",
      type: "PUBLIC",
    });

    await deleteDoc(doc(db, "families", family.id, "memos", memoId));
    return "저장 및 자동 삭제 성공";
  });

  await runProbeStep(results, "투표 저장", async () => {
    const pollId = await createPoll({
      createdBy: userId,
      description: "진단 후 자동 삭제되는 투표입니다.",
      familyId: family.id,
      multipleChoice: false,
      options: ["가능", "불가"],
      title: "[진단] 저장 권한 확인",
      type: "GENERAL",
    });

    await deleteDoc(doc(db, "families", family.id, "polls", pollId));
    return "저장 및 자동 삭제 성공";
  });

  await runProbeStep(results, "가족 전체방 준비", async () => {
    await getOrCreateFamilyRoom({
      createdBy: userId,
      familyId: family.id,
    });
    return "가족 전체방 확인 또는 생성 성공";
  });

  await runProbeStep(results, "1:1 채팅방 준비", async () => {
    const members = await getFamilyMembers(family.id);
    const targetMember = members.find((member) => member.userId !== userId);

    if (!targetMember) {
      return "다른 가족 구성원이 없어 1:1 채팅방 생성 검사는 건너뜀";
    }

    const memberIds = [userId, targetMember.userId].sort();
    const roomId = `${family.id}_direct_${memberIds.join("_")}`;
    const roomRef = doc(db, "families", family.id, "chatRooms", roomId);
    const roomExisted = (await getDoc(roomRef)).exists();

    await getOrCreateDirectRoom({
      createdBy: userId,
      familyId: family.id,
      targetUserId: targetMember.userId,
      targetUserName: targetMember.displayName ?? targetMember.nickname,
    });

    if (!roomExisted) {
      await deleteDoc(roomRef);
    }

    return roomExisted
      ? "기존 1:1 채팅방 확인 성공"
      : "1:1 채팅방 생성 및 자동 삭제 성공";
  });

  await runProbeStep(results, "채팅방 생성", async () => {
    const roomId = await createSecretRoom({
      createdBy: userId,
      familyId: family.id,
      name: "[진단] 저장 권한 확인",
    });

    await deleteDoc(doc(db, "families", family.id, "chatRooms", roomId));
    return "저장 및 자동 삭제 성공";
  });

  return results;
}

async function runProbeStep(
  results: WriteProbeResult[],
  label: string,
  probe: () => Promise<string | void>
) {
  try {
    const detail = await probe();
    results.push({
      detail: detail ?? "성공",
      label,
      ok: true,
    });
  } catch (error) {
    results.push({
      detail: getFirebaseErrorMessage(error),
      label,
      ok: false,
    });
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
