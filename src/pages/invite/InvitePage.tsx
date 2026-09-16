import { ArrowRight, GoogleLogo, UsersThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import { joinFamilyByInviteCode } from "../../features/family/services/familyService";
import { useFamily } from "../../features/family/useFamily";

const PENDING_INVITE_STORAGE_KEY = "our-share-pending-invite-code";

export function InvitePage() {
  const { inviteCode: routeInviteCode = "" } = useParams();
  const { authError, signIn, status, user } = useAuth();
  const { refreshFamilies } = useFamily();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const attemptedCodeRef = useRef("");
  const [joinError, setJoinError] = useState("");
  const normalizedInviteCode = routeInviteCode.trim().toUpperCase();
  const isValidCode = /^[A-Z0-9]{6}$/.test(normalizedInviteCode);

  useEffect(() => {
    if (!isValidCode) {
      return;
    }

    try {
      window.localStorage.setItem(PENDING_INVITE_STORAGE_KEY, normalizedInviteCode);
    } catch {
      // 로그인 redirect 환경에서 저장소를 사용할 수 없어도 현재 URL의 코드를 사용한다.
    }
  }, [isValidCode, normalizedInviteCode]);

  useEffect(() => {
    if (status !== "authenticated" || !user || !isValidCode) {
      return;
    }

    if (attemptedCodeRef.current === normalizedInviteCode) {
      return;
    }

    attemptedCodeRef.current = normalizedInviteCode;
    setJoinError("");

    void joinFamilyByInviteCode({ inviteCode: normalizedInviteCode, user })
      .then(async (result) => {
        await refreshFamilies(result.id);
        removePendingInviteCode();
        showToast({ message: `${result.name} 그룹에 참여했습니다.`, variant: "success" });
        navigate("/", { replace: true });
      })
      .catch((error: unknown) => {
        attemptedCodeRef.current = "";
        setJoinError(error instanceof Error ? error.message : "그룹 참여에 실패했습니다.");
      });
  }, [isValidCode, navigate, normalizedInviteCode, refreshFamilies, showToast, status, user]);

  if (!isValidCode) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <InviteHeader />
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          유효하지 않은 초대 링크입니다. 그룹 오너에게 새 초대 링크를 요청해주세요.
        </p>
      </Card>
    );
  }

  if (status === "loading" || (status === "authenticated" && !joinError)) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <InviteHeader />
        <div className="mt-6 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          {status === "authenticated"
            ? "초대 그룹에 참여하는 중입니다."
            : "로그인 상태를 확인하고 있습니다."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-8 max-w-md">
      <InviteHeader />
      <div className="mt-6 rounded-2xl bg-brand-soft p-4">
        <p className="text-xs font-semibold text-brand">그룹 초대</p>
        <p className="mt-2 text-2xl font-semibold tracking-[0.16em] text-[var(--color-text-primary)]">
          {normalizedInviteCode}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
        Google 계정으로 가입하거나 로그인하면 초대 코드를 다시 입력하지 않고 바로 그룹에 참여합니다.
      </p>
      {status === "authenticated" ? (
        <Button className="mt-6 w-full" onClick={() => navigate("/", { replace: true })}>
          홈으로 돌아가기
          <ArrowRight className="ml-auto" size={18} weight="bold" />
        </Button>
      ) : (
        <Button className="mt-6 w-full" onClick={() => void signIn()}>
          <GoogleLogo size={18} weight="bold" />
          Google로 가입하고 참여하기
          <ArrowRight className="ml-auto" size={18} weight="bold" />
        </Button>
      )}
      {authError || joinError ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {authError ?? joinError}
        </p>
      ) : null}
    </Card>
  );
}

function InviteHeader() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white">
        <UsersThree size={23} weight="bold" />
      </span>
      <div>
        <p className="text-sm font-semibold text-brand">우리끼리</p>
        <h1 className="mt-1 text-xl font-semibold">그룹에 초대되었어요</h1>
      </div>
    </div>
  );
}

function removePendingInviteCode() {
  try {
    window.localStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 참여 완료는 유지한다.
  }
}
