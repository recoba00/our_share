import { deleteDoc, doc } from "firebase/firestore";
import { createCalendarEvent } from "../../calendar/services/calendarService";
import { createSecretRoom } from "../../chat/services/chatService";
import { getFirstFamilyForUser } from "../../family/services/familyService";
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

    await deleteDoc(doc(db, "calendarEvents", eventId));
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

    await deleteDoc(doc(db, "memos", memoId));
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

    await deleteDoc(doc(db, "polls", pollId));
  });

  await runProbeStep(results, "채팅방 생성", async () => {
    const roomId = await createSecretRoom({
      createdBy: userId,
      familyId: family.id,
      name: "[진단] 저장 권한 확인",
    });

    await deleteDoc(doc(db, "chatRooms", roomId));
  });

  return results;
}

async function runProbeStep(
  results: WriteProbeResult[],
  label: string,
  probe: () => Promise<void>
) {
  try {
    await probe();
    results.push({
      detail: "저장 및 자동 삭제 성공",
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
