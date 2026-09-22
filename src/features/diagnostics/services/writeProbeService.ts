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
  skipped?: boolean;
};

export async function runMvpWriteProbe(userId: string): Promise<WriteProbeResult[]> {
  const family = await getFirstFamilyForUser(userId);

  if (!family) {
    return [
      {
        detail: "로그인 계정에 연결된 크루가 없어요. 홈에서 크루를 만들거나 초대받아 참여해주세요.",
        label: "크루 멤버십",
        ok: false,
      },
    ];
  }

  const results: WriteProbeResult[] = [
    {
      detail: `${family.name} / ${family.id}`,
        label: "크루 멤버십",
      ok: true,
    },
  ];

  await runProbeStep(results, "캘린더 저장", async () => {
    const eventId = await createCalendarEvent({
      allDay: true,
      category: "ETC",
      createdBy: userId,
      description: "진단 후 자동 삭제되는 일정이에요.",
      endDate: getToday(),
      familyId: family.id,
      isDayOff: false,
      repeat: "NONE",
      startDate: getToday(),
      title: "[진단] 저장 권한 확인",
    });

    try {
      return "저장 권한 확인 성공";
    } finally {
      await deleteDoc(doc(db, "families", family.id, "calendarEvents", eventId));
    }
  });

  await runProbeStep(results, "메모 저장", async () => {
    const memoId = await createMemo({
      content: "진단 후 자동 삭제되는 메모예요.",
      createdBy: userId,
      familyId: family.id,
      password: "",
      title: "[진단] 저장 권한 확인",
      type: "PUBLIC",
    });

    try {
      return "저장 권한 확인 성공";
    } finally {
      await deleteDoc(doc(db, "families", family.id, "memos", memoId));
    }
  });

  await runProbeStep(results, "투표 저장", async () => {
    const pollId = await createPoll({
      createdBy: userId,
      description: "진단 후 자동 삭제되는 투표예요.",
      familyId: family.id,
      multipleChoice: false,
      options: ["가능", "불가"],
      title: "[진단] 저장 권한 확인",
      type: "GENERAL",
    });

    try {
      return "저장 권한 확인 성공";
    } finally {
      await deleteDoc(doc(db, "families", family.id, "polls", pollId));
    }
  });

  results.push({
    detail: "실제 위치 공유 데이터를 보호하기 위해 자동 쓰기 검사를 건너뛰었어요. 위치 공유 버튼으로 직접 확인해주세요.",
    label: "위치 공유 저장",
    ok: false,
    skipped: true,
  });

  await runProbeStep(results, "크루 전체방 준비", async () => {
    await getOrCreateFamilyRoom({
      createdBy: userId,
      familyId: family.id,
    });
    return "크루 전체방 확인 또는 생성 성공";
  });

  await runProbeStep(results, "1:1 채팅방 준비", async () => {
    const members = await getFamilyMembers(family.id);
    const targetMember = members.find((member) => member.userId !== userId);

    if (!targetMember) {
      return "다른 크루 멤버가 없어 1:1 채팅방 생성 검사는 건너뜀";
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
    const familyMembers = await getFamilyMembers(family.id);
    const otherMember = familyMembers.find((member) => member.userId !== userId);

    if (!otherMember) {
      return "다른 크루 멤버가 없어 비밀방 검사를 건너뛰었어요.";
    }

    const roomId = await createSecretRoom({
      createdBy: userId,
      familyId: family.id,
      memberIds: [otherMember.userId],
      name: "[진단] 저장 권한 확인",
    });

    try {
      return "저장 권한 확인 성공";
    } finally {
      await deleteDoc(doc(db, "families", family.id, "chatRooms", roomId));
    }
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
