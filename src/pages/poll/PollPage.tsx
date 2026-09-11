import { ChatCircleDots, CheckCircle, Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  getOrCreateFamilyRoom,
  sendPollMessage,
  subscribeChatRooms,
} from "../../features/chat/services/chatService";
import type { ChatRoom } from "../../features/chat/types/chatTypes";
import { getFirstFamilyForUser } from "../../features/family/services/familyService";
import {
  createPoll,
  getPolls,
  getPollVotes,
  votePoll,
} from "../../features/poll/services/pollService";
import type { Poll, PollType, PollVote } from "../../features/poll/types/pollTypes";

export function PollPage() {
  const { user } = useAuth();
  const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [votes, setVotes] = useState<Record<string, PollVote[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("GENERAL");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [optionsText, setOptionsText] = useState("치킨\n피자\n삼겹살");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadPollData(user.uid);
  }, [user]);

  useEffect(() => {
    if (!family || !user) {
      return;
    }

    return subscribeChatRooms({
      familyId: family.id,
      onChange: (nextRooms) => {
        setRooms(nextRooms);
        setSelectedRoomId((currentRoomId) => currentRoomId || nextRooms[0]?.id || "");
      },
      onError: setFeedback,
      userId: user.uid,
    });
  }, [family, user]);

  async function loadPollData(userId: string) {
    setIsLoading(true);
    setFeedback("");

    try {
      const nextFamily = await getFirstFamilyForUser(userId);

      if (!nextFamily) {
        setFamily(null);
        setPolls([]);
        setRooms([]);
        setSelectedRoomId("");
        setFeedback("투표를 만들려면 먼저 홈에서 가족을 만들거나 초대 코드로 참여해주세요.");
        return;
      }

      setFamily({ id: nextFamily.id, name: nextFamily.name });

      const nextPolls = await getPolls(nextFamily.id);
      setPolls(nextPolls);
      setVotes(await getPollVotes(nextFamily.id, nextPolls.map((poll) => poll.id)));

      try {
        const familyRoomId = await getOrCreateFamilyRoom({
          createdBy: userId,
          familyId: nextFamily.id,
        });
        setSelectedRoomId((currentRoomId) => currentRoomId || familyRoomId);
      } catch (roomError) {
        setSelectedRoomId("");
        setFeedback(
          `투표는 만들 수 있지만 채팅방 연결 확인에 실패했습니다. ${getErrorMessage(roomError)}`
        );
      }
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreatePoll() {
    if (!user || !family) {
      setFeedback("가족 정보를 먼저 불러와주세요.");
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      await createPoll({
        createdBy: user.uid,
        description,
        familyId: family.id,
        multipleChoice,
        options: optionsText.split("\n"),
        title,
        type,
      });
      setTitle("");
      setDescription("");
      setOptionsText("");
      setMultipleChoice(false);
      await loadPollData(user.uid);
      setFeedback("투표를 만들었습니다.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVote(poll: Poll) {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      await votePoll({
        poll,
        selectedOptions: selectedOptions[poll.id] ?? [],
        userId: user.uid,
      });
      await loadPollData(user.uid);
      setFeedback("투표를 반영했습니다.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendPollToChat(poll: Poll) {
    if (!user || !family || !selectedRoomId) {
      setFeedback("투표를 보낼 채팅방을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      await sendPollMessage({
        createdBy: user.uid,
        familyId: family.id,
        pollId: poll.id,
        pollTitle: poll.title,
        roomId: selectedRoomId,
      });
      setFeedback("투표를 채팅방으로 전송했습니다.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function toggleOption(poll: Poll, option: string) {
    setSelectedOptions((current) => {
      const selected = current[poll.id] ?? [];

      if (!poll.multipleChoice) {
        return { ...current, [poll.id]: [option] };
      }

      return {
        ...current,
        [poll.id]: selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card className="self-start">
        <div>
          <h2 className="text-xl font-black">투표 만들기</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {family ? `${family.name} 가족 투표` : "가족 정보가 필요합니다"}
          </p>
        </div>
        <div className="mt-5 grid gap-4">
          <Input
            label="투표 제목"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="예: 이번 주말 뭐 먹을까?"
            value={title}
          />
          <Input
            label="설명"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="선택 사항"
            value={description}
          />
          <label className="grid gap-2 text-sm font-semibold">
            투표 보기
            <textarea
              className="min-h-32 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => setOptionsText(event.target.value)}
              placeholder="한 줄에 하나씩 입력"
              value={optionsText}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton active={type === "GENERAL"} onClick={() => setType("GENERAL")}>
              일반
            </ChoiceButton>
            <ChoiceButton active={type === "DATE"} onClick={() => setType("DATE")}>
              날짜
            </ChoiceButton>
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold">
            <input
              checked={multipleChoice}
              className="size-4 accent-emerald-500"
              onChange={(event) => setMultipleChoice(event.target.checked)}
              type="checkbox"
            />
            복수 선택 허용
          </label>
          <Button disabled={isLoading || !family} onClick={handleCreatePoll}>
            <Plus size={18} weight="bold" />
            투표 만들기
          </Button>
          {family ? (
            <label className="grid gap-2 text-sm font-semibold">
              전송할 채팅방
              <select
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100"
                onChange={(event) => setSelectedRoomId(event.target.value)}
                value={selectedRoomId}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {feedback && (
            <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
              {feedback}
            </p>
          )}
        </div>
      </Card>

      <section className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black">진행중 투표</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              투표 메뉴에서 만들고 이후 채팅방으로 보낼 수 있습니다.
            </p>
          </div>
          <Button
            disabled={isLoading || !user}
            onClick={() => user && void loadPollData(user.uid)}
            variant="secondary"
          >
            새로고침
          </Button>
        </div>
      </Card>

        {polls.length === 0 ? (
          <Card>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              아직 생성된 투표가 없습니다.
            </p>
          </Card>
        ) : (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              onSelect={toggleOption}
              onSendPoll={handleSendPollToChat}
              onVote={handleVote}
              poll={poll}
              roomSelected={Boolean(selectedRoomId)}
              selected={selectedOptions[poll.id] ?? []}
              votes={votes[poll.id] ?? []}
            />
          ))
        )}
      </section>
    </div>
  );
}

function PollCard({
  onSelect,
  onSendPoll,
  onVote,
  poll,
  roomSelected,
  selected,
  votes,
}: {
  onSelect: (poll: Poll, option: string) => void;
  onSendPoll: (poll: Poll) => void;
  onVote: (poll: Poll) => void;
  poll: Poll;
  roomSelected: boolean;
  selected: string[];
  votes: PollVote[];
}) {
  const counts = useMemo(() => {
    return poll.options.reduce<Record<string, number>>((acc, option) => {
      acc[option] = votes.filter((vote) => vote.selectedOptions.includes(option)).length;
      return acc;
    }, {});
  }, [poll.options, votes]);
  const totalVotes = votes.length;

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black">{poll.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {poll.type === "DATE" ? "날짜 투표" : "일반 투표"} ·{" "}
            {poll.multipleChoice ? "복수 선택" : "단일 선택"}
          </p>
          {poll.description && (
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {poll.description}
            </p>
          )}
        </div>
        <Button disabled={!roomSelected} onClick={() => onSendPoll(poll)} variant="secondary">
          <ChatCircleDots size={18} weight="bold" />
          채팅방 전송
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {poll.options.map((option) => {
          const isSelected = selected.includes(option);
          const count = counts[option] ?? 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <button
              className={`rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-emerald-300 bg-brand-soft"
                  : "border-[var(--color-border)] bg-[var(--color-surface-muted)]"
              }`}
              key={option}
              onClick={() => onSelect(poll, option)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{option}</span>
                {isSelected && <CheckCircle className="text-brand" size={20} weight="fill" />}
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                {count}표 · {percent}%
              </p>
            </button>
          );
        })}
      </div>

      <Button className="mt-4 w-full" onClick={() => onVote(poll)}>
        투표하기
      </Button>
    </Card>
  );
}

function ChoiceButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-11 rounded-xl text-sm font-bold transition ${
        active
          ? "bg-brand text-white"
          : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "처리 중 오류가 발생했습니다.";
}
