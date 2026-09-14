import { ChatCircleDots, CheckCircle, Plus, Trash } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useConfirmDialog } from "../../components/common/confirmDialogContext";
import { Input } from "../../components/common/Input";
import { useToast } from "../../components/common/toastContext";
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
  deletePoll,
  getPolls,
  getPollVotes,
  votePoll,
} from "../../features/poll/services/pollService";
import type { Poll, PollType, PollVote } from "../../features/poll/types/pollTypes";

export function PollPage() {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [family, setFamily] = useState<{ id: string; name: string } | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [votes, setVotes] = useState<Record<string, PollVote[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("GENERAL");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [options, setOptions] = useState(["치킨", "피자", "삼겹살"]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const notify = useCallback(
    (message: string, variant: "error" | "info" | "success") => {
      setFeedback(message);
      showToast({ message, variant });
    },
    [showToast]
  );

  const loadPollData = useCallback(async (userId: string) => {
    setIsLoading(true);
    setFeedback("");

    try {
      const nextFamily = await getFirstFamilyForUser(userId);

      if (!nextFamily) {
        setFamily(null);
        setPolls([]);
        setRooms([]);
        setSelectedRoomId("");
        notify("투표를 만들려면 먼저 홈에서 가족을 만들거나 초대 코드로 참여해주세요.", "info");
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
        notify(
          `투표는 만들 수 있지만 채팅방 연결 확인에 실패했습니다. ${getErrorMessage(roomError)}`,
          "error"
        );
      }
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!user) {
      return;
    }

    queueMicrotask(() => {
      void loadPollData(user.uid);
    });
  }, [loadPollData, user]);

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

  async function handleCreatePoll() {
    if (!user || !family) {
      notify("가족 정보를 먼저 불러와주세요.", "info");
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
        options,
        title,
        type,
      });
      setTitle("");
      setDescription("");
      setOptions([""]);
      setMultipleChoice(false);
      setIsCreateOpen(false);
      await loadPollData(user.uid);
      notify("투표를 만들었습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
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
      notify("투표를 반영했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendPollToChat(poll: Poll) {
    if (!user || !family || !selectedRoomId) {
      notify("투표를 보낼 채팅방을 선택해주세요.", "info");
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
      notify("투표를 채팅방으로 전송했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeletePoll(poll: Poll) {
    if (!family) {
      return;
    }

    const confirmed = await confirm({
      confirmLabel: "삭제",
      description: `'${poll.title}' 투표와 참여 내역을 삭제합니다.`,
      title: "투표를 삭제할까요?",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      await deletePoll({
        familyId: family.id,
        pollId: poll.id,
      });
      await loadPollData(user?.uid ?? "");
      notify("투표를 삭제했습니다.", "success");
    } catch (error) {
      notify(getErrorMessage(error), "error");
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

  function addPollOption() {
    setOptions((current) => [...current, ""]);
  }

  function removePollOption(index: number) {
    setOptions((current) =>
      current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index)
    );
  }

  function updatePollOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, optionIndex) => (optionIndex === index ? value : option))
    );
  }

  const createPollForm = (
    <>
        <div>
          <h2 className="text-xl font-semibold">투표 만들기</h2>
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
          <PollOptionEditor
            onAdd={addPollOption}
            onRemove={removePollOption}
            onUpdate={updatePollOption}
            options={options}
          />
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
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100"
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
    </>
  );

  return (
    <>
      <MobileCreateButton label="+ 투표" onClick={() => setIsCreateOpen(true)} />
      <ActionLayer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="투표 만들기"
      >
        {createPollForm}
      </ActionLayer>

    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card className="hidden self-start lg:block">
        {createPollForm}
      </Card>

      <section className="grid gap-4">
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">진행중 투표</h2>
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
              onDelete={handleDeletePoll}
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
    </>
  );
}

function PollCard({
  onDelete,
  onSelect,
  onSendPoll,
  onVote,
  poll,
  roomSelected,
  selected,
  votes,
}: {
  onDelete: (poll: Poll) => void;
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
          <h3 className="text-lg font-semibold">{poll.title}</h3>
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
        <div className="flex gap-2">
          <Button disabled={!roomSelected} onClick={() => onSendPoll(poll)} variant="secondary">
            <ChatCircleDots size={18} weight="bold" />
            채팅방 전송
          </Button>
          <Button onClick={() => onDelete(poll)} variant="secondary">
            <Trash size={18} weight="bold" />
            삭제
          </Button>
        </div>
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
                <span className="font-semibold">{option}</span>
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
      className={`h-11 rounded-xl text-sm font-semibold transition ${
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

function PollOptionEditor({
  onAdd,
  onRemove,
  onUpdate,
  options,
}: {
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  options: string[];
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">투표 항목</span>
        <button
          className="text-sm font-semibold text-brand"
          onClick={onAdd}
          type="button"
        >
          + 항목 추가
        </button>
      </div>
      <div className="grid gap-2">
        {options.map((option, index) => (
          <div className="flex items-center gap-2" key={index}>
            <input
              className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) => onUpdate(index, event.target.value)}
              placeholder={`항목 ${index + 1}`}
              value={option}
            />
            <button
              aria-label={`항목 ${index + 1} 삭제`}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-slate-500 transition hover:text-red-500 disabled:opacity-40"
              disabled={options.length <= 2}
              onClick={() => onRemove(index)}
              type="button"
            >
              <Trash size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "처리 중 오류가 발생했습니다.";
}
