import type { PropsWithChildren } from "react";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { useAuth } from "../../features/auth/useAuth";

export function RequireAuth({ children }: PropsWithChildren) {
  const { signIn, status } = useAuth();

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
      <Card className="mx-auto max-w-md">
        <h2 className="text-xl font-black">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
          가족 정보와 개인 데이터를 보호하기 위해 Google 로그인 후 이용할 수 있습니다.
        </p>
        <Button className="mt-5 w-full" onClick={signIn}>
          Google로 로그인
        </Button>
      </Card>
    );
  }

  return children;
}
