import { ArrowRight, UsersThree } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SignInConsentButton } from "../../components/compliance/SignInConsentButton";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useToast } from "../../components/common/toastContext";
import { useAuth } from "../../features/auth/useAuth";
import { joinFamilyByInviteCode } from "../../features/family/services/familyService";
import {
  clearPendingInviteCode,
  savePendingInviteCode,
} from "../../features/family/services/pendingInviteService";
import { useFamily } from "../../features/family/useFamily";

export function InvitePage() {
  const { inviteCode: routeInviteCode = "" } = useParams();
  const { authError, status, user } = useAuth();
  const { refreshFamilies } = useFamily();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const attemptedCodeRef = useRef("");
  const [joinError, setJoinError] = useState("");
  const [joinAttempt, setJoinAttempt] = useState(0);
  const normalizedInviteCode = routeInviteCode.trim().toUpperCase();
  const isValidCode = /^[A-Z0-9]{6}$/.test(normalizedInviteCode);

  useEffect(() => {
    if (!isValidCode) {
      return;
    }

    savePendingInviteCode(normalizedInviteCode);
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
        clearPendingInviteCode();
        showToast({
          message: result.alreadyMember
            ? `이미 ${result.name} 크루에 참여 중이에요.`
            : `${result.name} 크루에 참여했어요.`,
          variant: result.alreadyMember ? "info" : "success",
        });
        navigate("/", { replace: true });
      })
      .catch((error: unknown) => {
        attemptedCodeRef.current = "";
        setJoinError(error instanceof Error ? error.message : "크루에 참여하지 못했어요.");
      });
  }, [isValidCode, joinAttempt, navigate, normalizedInviteCode, refreshFamilies, showToast, status, user]);

  if (!isValidCode) {
    return (
      <Card className="mx-auto mt-8 max-w-md">
        <InviteHeader />
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          초대 링크가 만료됐거나 잘못됐어요. 크루장에게 새 링크를 받아주세요.
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
            ? "초대받은 크루에 참여하는 중이에요."
            : "로그인 상태를 확인하고 있어요."}
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto mt-8 max-w-md">
      <InviteHeader />
      <div className="mt-6 rounded-2xl bg-brand-soft p-4">
        <p className="text-xs font-semibold text-brand">크루 초대</p>
        <p className="mt-2 text-2xl font-semibold tracking-[0.16em] text-[var(--color-text-primary)]">
          {normalizedInviteCode}
        </p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
        Google로 로그인하면 초대 코드를 다시 입력하지 않고 바로 크루에 참여해요.
      </p>
      {status === "authenticated" ? (
        <Button
          className="mt-6 w-full"
          onClick={() => {
            if (joinError) {
              attemptedCodeRef.current = "";
              setJoinError("");
              setJoinAttempt((attempt) => attempt + 1);
              return;
            }

            navigate("/", { replace: true });
          }}
        >
          {joinError ? "다시 크루 참여하기" : "홈으로 돌아가기"}
          <ArrowRight className="ml-auto" size={18} weight="bold" />
        </Button>
      ) : (
        <SignInConsentButton className="mt-6 w-full" label="Google로 가입하고 참여하기" />
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
        <h1 className="mt-1 text-xl font-semibold">크루에 초대되었어요</h1>
      </div>
    </div>
  );
}
