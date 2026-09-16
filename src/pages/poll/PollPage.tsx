import {
  CalendarDots,
  ChartBar,
  ChatCircleDots,
  CheckCircle,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionLayer, MobileCreateButton } from "../../components/common/ActionLayer";
import { AnimatedCheckbox } from "../../components/common/AnimatedCheckbox";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { DesktopWorkspace } from "../../components/layout/DesktopWorkspace";
import { SectionHeading } from "../../components/common/SectionHeading";
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
import { useFamily } from "../../features/family/useFamily";
import { truncateFamilyName } from "../../features/family/utils/familyName";
import { DatePollPicker } from "../../features/poll/components/DatePollPicker";
import { PollOptionEditor } from "../../features/poll/components/PollOptionEditor";
import {
  createPoll,
  deletePoll,
  getPolls,
  getPollVotes,
  votePoll,
} from "../../features/poll/services/pollService";
import type { Poll, PollType, PollVote } from "../../features/poll/types/pollTypes";
import {
  getNormalizedPollOptions,
  hasDuplicatePollOptions,
} from "../../features/poll/utils/pollDraft";

export function PollPage() {
  const { user } = useAuth();
  const { activeFamily: family, isLoading: isFamilyLoading } = useFamily();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [votes, setVotes] = useState<Record<string, PollVote[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PollType>("GENERAL");
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [options, setOptions] = useState(["치킨", "피자", "삼겹살"]);
  const [dateOptions, setDateOptions] = useState<string[]>([]);
  const [datePickerViewDate, setDatePickerViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pollRequestIdRef = useRef(0);
  const normalizedOptions = getNormalizedPollOptions(options);
  const hasDuplicateOptions = hasDuplicatePollOptions(options);
  const canCreatePoll =
    Boolean(family) &&
    title.trim().length > 0 &&
    (type === "DATE"
      ? dateOptions.length >= 2
      : normalizedOptions.length >= 2 && !hasDuplicateOptions);

  const notify = useCallback(
    (message: string, variant: "error" | "info" | "success") => {
      showToast({ message, variant });
    },
    [showToast]
  );

  const loadPollData = useCallback(async (userId: string) => {
    const requestId = pollRequestIdRef.current + 1;
    pollRequestIdRef.current = requestId;
    const isCurrentRequest = () => pollRequestIdRef.current === requestId;

    setIsLoading(true);

    try {
      if (!family) {
        if (isCurrentRequest()) {
          setPolls([]);
          setRooms([]);
          setSelectedRoomId("");
        }
        return;
      }

      const nextPolls = await getPolls(family.id);
      if (!isCurrentRequest()) {
        return;
      }

      setPolls(nextPolls);
      const nextVotes = await getPollVotes(family.id, nextPolls.map((poll) => poll.id));
      if (!isCurrentRequest()) {
        return;
      }

      setVotes(nextVotes);

      try {
        const familyRoomId = await getOrCreateFamilyRoom({
          createdBy: userId,
          familyId: family.id,
        });
        if (!isCurrentRequest()) {
          return;
        }

        setSelectedRoomId((currentRoomId) => currentRoomId || familyRoomId);
      } catch (roomError) {
        if (!isCurrentRequest()) {
          return;
        }

        setSelectedRoomId("");
        notify(
          `투표는 만들 수 있지만 채팅방 연결 확인에 실패했습니다. ${getErrorMessage(roomError)}`,
          "error"
        );
      }
    } catch (error) {
      if (isCurrentRequest()) {
        notify(getErrorMessage(error), "error");
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [family, notify]);

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
      onError: (message) => notify(message, "error"),
      userId: user.uid,
    });
  }, [family, notify, user]);

  async function handleCreatePoll() {
    if (!user || !family) {
      notify("그룹 정보를 먼저 불러와주세요.", "info");
      return;
    }

    setIsLoading(true);

    try {
      await createPoll({
        createdBy: user.uid,
        description,
        familyId: family.id,
        multipleChoice: type === "DATE" ? false : multipleChoice,
        options: type === "DATE" ? dateOptions : options,
        title,
        type,
      });
      setTitle("");
      setDescription("");
      setOptions(["치킨", "피자", "삼겹살"]);
      setDateOptions([]);
      setType("GENERAL");
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

  function toggleDateOption(dateValue: string) {
    setDateOptions((current) =>
      current.includes(dateValue)
        ? current.filter((selectedDate) => selectedDate !== dateValue)
        : [...current, dateValue].sort()
    );
  }

  const createPollForm = (
    <>
        <SectionHeading
          description={family ? `${truncateFamilyName(family.name)} 그룹 투표` : "그룹 정보가 필요합니다"}
          icon={<ChartBar size={20} weight="bold" />}
          title="투표 만들기"
        />
        <div className="mt-4 grid gap-3">
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
          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton active={type === "GENERAL"} onClick={() => setType("GENERAL")}>
              <ChartBar size={17} weight="bold" />
              일반
            </ChoiceButton>
            <ChoiceButton
              active={type === "DATE"}
              onClick={() => {
                setType("DATE");
                setMultipleChoice(false);
              }}
            >
              <CalendarDots size={17} weight="bold" />
              날짜
            </ChoiceButton>
          </div>
          {type === "DATE" ? (
            <DatePollPicker
              selectedDates={dateOptions}
              setViewDate={setDatePickerViewDate}
              toggleDate={toggleDateOption}
              viewDate={datePickerViewDate}
            />
          ) : (
            <PollOptionEditor
              onAdd={addPollOption}
              onRemove={removePollOption}
              onUpdate={updatePollOption}
              options={options}
            />
          )}
          {type === "GENERAL" ? (
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold">
              <AnimatedCheckbox
                checked={multipleChoice}
                onChange={(event) => setMultipleChoice(event.target.checked)}
              />
              복수 선택 허용
            </label>
          ) : (
            <p className="rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm leading-5 text-[var(--color-text-secondary)]">
              날짜 투표는 하나의 날짜만 선택할 수 있게 생성됩니다.
            </p>
          )}
          <Button disabled={isFamilyLoading || isLoading || !canCreatePoll} onClick={handleCreatePoll}>
            <Plus size={18} weight="bold" />
            투표 만들기
          </Button>
          {!canCreatePoll ? (
            <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
              {type === "GENERAL" && hasDuplicateOptions
                ? "중복된 후보 항목은 사용할 수 없습니다."
                : `제목과 후보 ${type === "DATE" ? "날짜" : "항목"} 2개 이상이 필요합니다.`}
            </p>
          ) : null}
          {family ? (
            <label className="grid gap-2 text-sm font-semibold">
              전송할 채팅방
              <select
                className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-normal text-[var(--color-text-primary)] outline-none transition focus:border-brand focus:ring-4 focus:ring-emerald-100"
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

    <DesktopWorkspace sidebar={<Card className="hidden lg:block">{createPollForm}</Card>}>
      <section className="grid gap-4">
      <Card>
        <SectionHeading
          action={
            <Button
              disabled={isLoading || !user}
              onClick={() => user && void loadPollData(user.uid)}
              variant="secondary"
            >
              새로고침
            </Button>
          }
          description="투표 메뉴에서 만들고 이후 채팅방으로 보낼 수 있습니다."
          icon={<ChartBar size={20} weight="bold" />}
          title="진행 중인 투표"
        />
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
    </DesktopWorkspace>
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
              className={`rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.99] ${
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
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
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
