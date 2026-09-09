import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../lib/firebase/app";
import type { Poll, PollType, PollVote } from "../types/pollTypes";

type CreatePollInput = {
  createdBy: string;
  description: string;
  familyId: string;
  multipleChoice: boolean;
  options: string[];
  title: string;
  type: PollType;
};

export async function createPoll(input: CreatePollInput) {
  const pollRef = doc(collection(db, "polls"));
  const normalizedOptions = input.options.map((option) => option.trim()).filter(Boolean);

  if (!input.title.trim()) {
    throw new Error("투표 제목을 입력해주세요.");
  }

  if (normalizedOptions.length < 2) {
    throw new Error("투표 보기는 2개 이상 필요합니다.");
  }

  await setDoc(pollRef, {
    id: pollRef.id,
    familyId: input.familyId,
    chatRoomId: null,
    title: input.title.trim(),
    description: input.description.trim(),
    type: input.type,
    options: normalizedOptions,
    multipleChoice: input.multipleChoice,
    anonymous: false,
    closesAt: null,
    resultVisibility: "ALWAYS",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return pollRef.id;
}

export async function getPolls(familyId: string): Promise<Poll[]> {
  const pollsQuery = query(
    collection(db, "polls"),
    where("familyId", "==", familyId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(pollsQuery);

  return snapshot.docs.map((pollDoc) => pollDoc.data() as Poll);
}

export function subscribePolls({
  familyId,
  onChange,
}: {
  familyId: string;
  onChange: (polls: Poll[]) => void;
}): Unsubscribe {
  const pollsQuery = query(collection(db, "polls"), where("familyId", "==", familyId));

  return onSnapshot(pollsQuery, (snapshot) => {
    const polls = snapshot.docs
      .map((pollDoc) => pollDoc.data() as Poll)
      .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

    onChange(polls);
  });
}

export async function votePoll({
  poll,
  selectedOptions,
  userId,
}: {
  poll: Poll;
  selectedOptions: string[];
  userId: string;
}) {
  const normalizedSelections = poll.multipleChoice
    ? selectedOptions
    : selectedOptions.slice(0, 1);

  if (normalizedSelections.length === 0) {
    throw new Error("투표할 보기를 선택해주세요.");
  }

  await setDoc(
    doc(db, "pollVotes", `${poll.id}_${userId}`),
    {
      pollId: poll.id,
      userId,
      selectedOptions: normalizedSelections,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPollVotes(pollIds: string[]): Promise<Record<string, PollVote[]>> {
  if (pollIds.length === 0) {
    return {};
  }

  const votesQuery = query(
    collection(db, "pollVotes"),
    where("pollId", "in", pollIds.slice(0, 10))
  );
  const snapshot = await getDocs(votesQuery);

  return snapshot.docs.reduce<Record<string, PollVote[]>>((acc, voteDoc) => {
    const vote = voteDoc.data() as PollVote;
    acc[vote.pollId] = [...(acc[vote.pollId] ?? []), vote];
    return acc;
  }, {});
}

function getTime(value: unknown) {
  if (value && typeof value === "object" && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }

  return 0;
}
