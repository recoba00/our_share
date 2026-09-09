import {
  BatteryHigh,
  CalendarDots,
  GoogleLogo,
  LinkSimple,
  MapPin,
  Note,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Avatar } from "../../components/common/Avatar";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { Input } from "../../components/common/Input";
import { useAuth } from "../../features/auth/useAuth";
import {
  createFamily,
  getFamilyMembers,
  getFirstFamilyForUser,
  joinFamilyByInviteCode,
} from "../../features/family/services/familyService";
import type { FamilyMemberProfile } from "../../features/family/types/familyTypes";
import { useMyLocationShare } from "../../features/location/hooks/useMyLocationShare";

const family = [
  { name: "아빠", place: "회사", time: "5분 전", battery: "83%" },
  { name: "엄마", place: "집", time: "방금", battery: "충전 중" },
  { name: "나", place: "학교 근처", time: "12분 전", battery: "61%" },
];

export function HomePage() {
  const { signIn, status, user } = useAuth();
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeFamily, setActiveFamily] = useState<{
    id: string;
    inviteCode: string;
    name: string;
  } | null>(null);
  const [members, setMembers] = useState<FamilyMemberProfile[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locationShare = useMyLocationShare({
    familyId: activeFamily?.id ?? null,
    userId: user?.uid ?? null,
  });

  useEffect(() => {
    if (!user || activeFamily) {
      return;
    }

    void getFirstFamilyForUser(user.uid).then(async (result) => {
      if (!result) {
        return;
      }

      setActiveFamily(result);
      setMembers(await getFamilyMembers(result.id));
    });
  }, [activeFamily, user]);

  async function handleCreateFamily() {
    if (!user || !familyName.trim()) {
      setFeedback("가족 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await createFamily({ name: familyName.trim(), owner: user });
      setActiveFamily({
        id: result.id,
        inviteCode: result.inviteCode,
        name: familyName.trim(),
      });
      setMembers(await getFamilyMembers(result.id));
      setFeedback(`가족이 생성되었습니다. 초대 코드: ${result.inviteCode}`);
      setFamilyName("");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinFamily() {
    if (!user || !inviteCode.trim()) {
      setFeedback("초대 코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await joinFamilyByInviteCode({
        inviteCode,
        user,
      });
      setActiveFamily({
        id: result.id,
        inviteCode: inviteCode.trim().toUpperCase(),
        name: result.name,
      });
      setMembers(await getFamilyMembers(result.id));
      setFeedback(`${result.name} 가족에 참여했습니다.`);
      setInviteCode("");
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <Card>
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          로그인 상태를 확인하고 있습니다.
        </p>
      </Card>
    );
  }

  if (status === "guest") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-slate-800 p-6 text-white shadow-lg lg:p-8">
          <p className="text-sm font-semibold opacity-80">우리 가족 스마트 홈</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight lg:text-5xl">
            가족 위치, 일정, 메모, 투표를 한곳에서 관리해요
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50 lg:text-base">
            Google 계정으로 시작하고 가족을 만들거나 초대 코드로 참여하세요.
          </p>
        </section>
        <Card className="self-start">
          <h3 className="text-xl font-black">시작하기</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            프로필 이미지는 Google 계정의 photoURL을 사용합니다.
          </p>
          <Button className="mt-5 w-full" onClick={signIn}>
            <GoogleLogo size={20} weight="bold" />
            Google로 로그인
          </Button>
        </Card>
      </div>
    );
  }

  async function handleLoadFamily() {
    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const result = await getFirstFamilyForUser(user.uid);

      if (!result) {
        setFeedback("아직 참여한 가족이 없습니다.");
        return;
      }

      setActiveFamily(result);
      setMembers(await getFamilyMembers(result.id));
      setFeedback(`${result.name} 가족 정보를 불러왔습니다.`);
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[28px] bg-gradient-to-br from-emerald-500 to-slate-800 p-6 text-white shadow-lg">
        <p className="text-sm font-semibold opacity-80">오늘의 가족 상황</p>
        <h2 className="mt-2 text-3xl font-black leading-tight">
          모두의 위치와 일정을 한눈에 확인해요
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {family.map((member) => (
            <div key={member.name} className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <strong>{member.name}</strong>
                <BatteryHigh size={18} />
              </div>
              <p className="mt-3 flex items-center gap-1 text-sm">
                <MapPin size={16} weight="fill" />
                {member.place}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {member.time} · {member.battery}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Card>
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img
              alt={user.displayName ?? "사용자"}
              className="size-12 rounded-2xl"
              src={user.photoURL}
            />
          )}
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
              로그인됨
            </p>
            <h3 className="text-lg font-black">{user?.displayName ?? "가족 구성원"}</h3>
          </div>
        </div>
        <div className="mt-5 grid gap-4">
          {activeFamily && (
            <div className="rounded-2xl bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                현재 가족
              </p>
              <strong className="mt-1 block">{activeFamily.name}</strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                초대 코드: {activeFamily.inviteCode}
              </p>
            </div>
          )}
          <Input
            label="새 가족 이름"
            onChange={(event) => setFamilyName(event.target.value)}
            placeholder="예: 우리 가족"
            value={familyName}
          />
          <Button disabled={isSubmitting} onClick={handleCreateFamily}>
            <Plus size={18} weight="bold" />
            가족 생성
          </Button>
          <Input
            label="초대 코드"
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            placeholder="예: A1B2C3"
            value={inviteCode}
          />
          <Button disabled={isSubmitting} onClick={handleJoinFamily} variant="secondary">
            <LinkSimple size={18} weight="bold" />
            초대 코드로 참여
          </Button>
          <Button disabled={isSubmitting} onClick={handleLoadFamily} variant="secondary">
            <UsersThree size={18} weight="bold" />
            내 가족 불러오기
          </Button>
          <Button disabled={locationShare.isSharing} onClick={locationShare.shareCurrentLocation}>
            <MapPin size={18} weight="bold" />
            현재 위치 공유
          </Button>
          {feedback && (
            <p className="rounded-xl bg-brand-soft p-3 text-sm font-semibold text-emerald-900">
              {feedback}
            </p>
          )}
          {locationShare.message && (
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm font-semibold text-[var(--color-text-secondary)]">
              {locationShare.message}
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:col-span-2 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDots className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-bold">이달의 일정</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between">
              <span>가족 외식</span>
              <strong>오늘 18:30</strong>
            </li>
            <li className="flex justify-between">
              <span>할머니 생신</span>
              <strong>D-7</strong>
            </li>
            <li className="flex justify-between">
              <span>아빠 휴무</span>
              <strong>9/18</strong>
            </li>
          </ul>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <Note className="text-brand" size={22} weight="bold" />
            <h3 className="text-base font-bold">최근 메모와 투표</h3>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <p className="rounded-xl bg-[var(--color-surface-muted)] p-3">
              마트에서 우유 사오기
            </p>
            <p className="rounded-xl bg-brand-soft p-3 text-emerald-800">
              주말 메뉴 투표 진행 중
            </p>
          </div>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2">
          <UsersThree className="text-brand" size={22} weight="bold" />
          <h3 className="text-base font-bold">가족 구성원</h3>
        </div>
        {members.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div
                className="flex items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4"
                key={member.userId}
              >
                <Avatar
                  alt={member.displayName ?? member.nickname}
                  src={member.photoURL}
                />
                <div className="min-w-0">
                  <strong className="block truncate">
                    {member.displayName ?? member.nickname}
                  </strong>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {member.role} · {member.email ?? "이메일 없음"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
            가족을 만들거나 초대 코드로 참여하면 구성원이 표시됩니다.
          </p>
        )}
      </Card>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "처리 중 오류가 발생했습니다.";
}
