import { ShieldWarning } from "@phosphor-icons/react";
import { type PropsWithChildren, useEffect, useState } from "react";
import { Button } from "../common/Button";
import { isPlatformAdmin } from "../../features/admin/platformAdmin";
import { useAuth } from "../../features/auth/useAuth";
import { subscribeMyRestriction } from "../../features/moderation/services/moderationService";
import {
  restrictionReasonLabels,
  type UserRestriction,
} from "../../features/moderation/types/moderationTypes";

type RestrictionState = {
  error: string;
  isLoaded: boolean;
  restriction: UserRestriction | null;
  userId: string;
};

export function AccountRestrictionGate({ children }: PropsWithChildren) {
  const { signOut, status, user } = useAuth();
  const [state, setState] = useState<RestrictionState>({
    error: "",
    isLoaded: false,
    restriction: null,
    userId: "",
  });

  useEffect(() => {
    if (!user || isPlatformAdmin(user.uid)) {
      return;
    }

    return subscribeMyRestriction({
      onChange: (restriction) => {
        setState({ error: "", isLoaded: true, restriction, userId: user.uid });
      },
      onError: (error) => {
        setState({ error, isLoaded: true, restriction: null, userId: user.uid });
      },
      userId: user.uid,
    });
  }, [user]);

  if (status === "loading") {
    return <RestrictionLoading />;
  }

  if (!user || isPlatformAdmin(user.uid)) {
    return children;
  }

  if (state.userId !== user.uid || !state.isLoaded) {
    return <RestrictionLoading />;
  }

  if (!state.restriction) {
    return children;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-background)] p-5 text-[var(--color-text-primary)]">
      <section className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <span className="grid size-12 place-items-center rounded-lg bg-red-50 text-red-500 dark:bg-red-400/10 dark:text-red-300">
          <ShieldWarning size={26} weight="regular" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">서비스 이용이 제한됐어요</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          안전한 서비스 운영을 위해 계정 이용을 잠시 제한했어요.
        </p>
        <dl className="mt-5 grid gap-3 rounded-lg bg-[var(--color-surface-muted)] p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[var(--color-text-secondary)]">사유</dt>
            <dd className="text-right font-semibold">
              {restrictionReasonLabels[state.restriction.reason]}
            </dd>
          </div>
          {state.restriction.note ? (
            <div className="grid gap-1">
              <dt className="text-[var(--color-text-secondary)]">안내</dt>
              <dd className="whitespace-pre-line leading-6">{state.restriction.note}</dd>
            </div>
          ) : null}
        </dl>
        {state.error ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">
            {state.error}
          </p>
        ) : null}
        <Button className="mt-5 w-full" onClick={() => void signOut()} type="button" variant="secondary">
          다른 계정으로 로그인
        </Button>
      </section>
    </main>
  );
}

function RestrictionLoading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[var(--color-background)]">
      <p className="text-sm font-semibold text-[var(--color-text-secondary)]">계정 상태를 확인하고 있어요.</p>
    </div>
  );
}
