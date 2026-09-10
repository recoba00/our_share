import {
  Bell,
  Browser,
  CheckCircle,
  Database,
  MapPin,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useMemo, type ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useAuth } from "../../features/auth/useAuth";
import { firebaseApp, realtimeDb } from "../../lib/firebase/app";

type DiagnosticStatus = "ok" | "warning";

type DiagnosticItem = {
  detail: string;
  label: string;
  status: DiagnosticStatus;
};

export function DiagnosticsPage() {
  const { status, user } = useAuth();
  const diagnostics = useMemo(() => createDiagnostics(status, user?.uid), [
    status,
    user?.uid,
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="self-start">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-brand-soft p-3 text-brand">
            <ShieldCheck size={28} weight="bold" />
          </span>
          <div>
            <h2 className="text-xl font-black">진단</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              배포, Firebase, 브라우저 기능 상태를 빠르게 확인합니다.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <Button onClick={() => window.location.reload()}>다시 확인</Button>
          <Button onClick={() => window.location.assign("/our_share/")} variant="secondary">
            홈으로 이동
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <DiagnosticGroup
          icon={<Browser size={22} weight="bold" />}
          items={diagnostics.hosting}
          title="호스팅"
        />
        <DiagnosticGroup
          icon={<Database size={22} weight="bold" />}
          items={diagnostics.firebase}
          title="Firebase"
        />
        <DiagnosticGroup
          icon={<Bell size={22} weight="bold" />}
          items={diagnostics.browser}
          title="브라우저"
        />
        <DiagnosticGroup
          icon={<MapPin size={22} weight="bold" />}
          items={diagnostics.location}
          title="위치"
        />
      </section>
    </div>
  );
}

function DiagnosticGroup({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: DiagnosticItem[];
  title: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="text-brand">{icon}</span>
        <h3 className="text-base font-bold">{title}</h3>
      </div>

      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li
            className="rounded-2xl bg-[var(--color-surface-muted)] p-4"
            key={item.label}
          >
            <div className="flex items-start gap-3">
              <StatusIcon status={item.status} />
              <div className="min-w-0">
                <strong className="block text-sm">{item.label}</strong>
                <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function StatusIcon({ status }: { status: DiagnosticStatus }) {
  if (status === "ok") {
    return <CheckCircle className="shrink-0 text-brand" size={22} weight="fill" />;
  }

  return (
    <WarningCircle className="shrink-0 text-amber-500" size={22} weight="fill" />
  );
}

function createDiagnostics(authStatus: string, userId?: string) {
  const appOptions = firebaseApp.options;
  const isExpectedBasePath = window.location.pathname.startsWith("/our_share");
  const isSecure = window.isSecureContext;
  const notificationPermission =
    "Notification" in window ? Notification.permission : "unsupported";

  return {
    browser: [
      {
        detail: isSecure
          ? "현재 환경에서 보안 컨텍스트가 활성화되어 있습니다."
          : "Dothome HTTP에서는 서비스 워커와 알림이 제한될 수 있습니다.",
        label: "Secure Context",
        status: isSecure ? "ok" : "warning",
      },
      {
        detail:
          "serviceWorker" in navigator
            ? "브라우저가 서비스 워커를 지원합니다."
            : "이 브라우저는 서비스 워커를 지원하지 않습니다.",
        label: "Service Worker",
        status: "serviceWorker" in navigator ? "ok" : "warning",
      },
      {
        detail:
          notificationPermission === "unsupported"
            ? "이 브라우저는 알림을 지원하지 않습니다."
            : `현재 알림 권한은 ${notificationPermission} 상태입니다.`,
        label: "Notification",
        status:
          notificationPermission === "granted" ||
          notificationPermission === "default"
            ? "ok"
            : "warning",
      },
    ] satisfies DiagnosticItem[],
    firebase: [
      {
        detail: String(appOptions.projectId ?? "missing"),
        label: "Project ID",
        status: appOptions.projectId ? "ok" : "warning",
      },
      {
        detail: String(appOptions.authDomain ?? "missing"),
        label: "Auth Domain",
        status: appOptions.authDomain ? "ok" : "warning",
      },
      {
        detail: realtimeDb.app.options.databaseURL ?? "missing",
        label: "Realtime Database",
        status: realtimeDb.app.options.databaseURL ? "ok" : "warning",
      },
      {
        detail: userId
          ? `로그인됨: ${userId}`
          : authStatus === "loading"
            ? "로그인 상태를 확인하는 중입니다."
            : "현재 로그인 전 상태입니다.",
        label: "Auth State",
        status: authStatus === "authenticated" ? "ok" : "warning",
      },
    ] satisfies DiagnosticItem[],
    hosting: [
      {
        detail: window.location.origin,
        label: "Origin",
        status: "ok",
      },
      {
        detail: isExpectedBasePath
          ? "SPA base path가 /our_share 경로와 일치합니다."
          : "현재 경로가 /our_share 아래가 아닙니다.",
        label: "Base Path",
        status: isExpectedBasePath ? "ok" : "warning",
      },
      {
        detail: import.meta.env.MODE,
        label: "Build Mode",
        status: "ok",
      },
    ] satisfies DiagnosticItem[],
    location: [
      {
        detail:
          "geolocation" in navigator
            ? "브라우저가 위치 권한 요청을 지원합니다."
            : "이 브라우저는 위치 API를 지원하지 않습니다.",
        label: "Geolocation",
        status: "geolocation" in navigator ? "ok" : "warning",
      },
      {
        detail:
          "getBattery" in navigator
            ? "브라우저가 배터리 상태 조회를 지원합니다."
            : "배터리 상태 조회 미지원 브라우저입니다.",
        label: "Battery API",
        status: "ok",
      },
    ] satisfies DiagnosticItem[],
  };
}
