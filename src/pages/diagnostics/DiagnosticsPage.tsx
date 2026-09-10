import {
  Bell,
  Browser,
  CheckCircle,
  ClipboardText,
  Database,
  FloppyDisk,
  MapPin,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { useAuth } from "../../features/auth/useAuth";
import {
  runMvpWriteProbe,
  type WriteProbeResult,
} from "../../features/diagnostics/services/writeProbeService";
import { buildInfo, getShortCommit } from "../../lib/app/buildInfo";
import { firebaseApp, realtimeDb } from "../../lib/firebase/app";

type DiagnosticStatus = "ok" | "warning";

type DiagnosticItem = {
  detail: string;
  label: string;
  status: DiagnosticStatus;
};

const smokeChecklistItems = [
  "진단 화면에서 Firebase 프로젝트가 our-share-6baf5로 보인다",
  "진단 화면의 Build Commit이 최신 GitHub 커밋과 일치한다",
  "Google 로그인에 성공한다",
  "로그아웃에 성공한다",
  "가족을 생성하고 초대 코드가 표시된다",
  "다른 계정이 초대 코드로 가족에 참여한다",
  "가족 구성원 목록이 표시된다",
  "OWNER가 구성원 역할을 변경할 수 있다",
  "현재 위치 공유가 권한 허용 후 성공한다",
  "가족 위치 카드가 표시된다",
  "빠른 메시지가 가족 채팅방으로 전송된다",
  "일반 메모를 생성할 수 있다",
  "민감 메모를 생성하고 올바른 비밀번호로 열 수 있다",
  "민감 메모가 잘못된 비밀번호를 거부한다",
  "일정을 등록할 수 있다",
  "매년 반복 일정과 휴무일 일정을 등록할 수 있다",
  "캘린더 날짜 투표를 생성할 수 있다",
  "일반 투표를 생성하고 투표할 수 있다",
  "투표를 채팅방으로 전송할 수 있다",
  "가족방 텍스트 메시지를 전송할 수 있다",
  "1:1 채팅방과 그룹방을 열 수 있다",
  "채팅 읽음 상태가 갱신된다",
  "브라우저 알림 권한 흐름을 확인한다",
];

const smokeChecklistStorageKey = "our-share:mvp-smoke-checklist";

export function DiagnosticsPage() {
  const { status, user } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() =>
    readStoredChecklist()
  );
  const [probeResults, setProbeResults] = useState<WriteProbeResult[]>([]);
  const [isRunningProbe, setIsRunningProbe] = useState(false);
  const diagnostics = useMemo(() => createDiagnostics(status, user?.uid), [
    status,
    user?.uid,
  ]);
  const completedCount = checkedItems.size;

  useEffect(() => {
    window.localStorage.setItem(
      smokeChecklistStorageKey,
      JSON.stringify([...checkedItems])
    );
  }, [checkedItems]);

  function toggleChecklistItem(item: string) {
    setCheckedItems((current) => {
      const next = new Set(current);

      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }

      return next;
    });
  }

  function resetChecklist() {
    setCheckedItems(new Set());
  }

  async function handleRunWriteProbe() {
    if (!user) {
      setProbeResults([
        {
          detail: "저장 권한 검사는 Google 로그인 후 실행할 수 있습니다.",
          label: "로그인 상태",
          ok: false,
        },
      ]);
      return;
    }

    setIsRunningProbe(true);
    setProbeResults([]);

    try {
      setProbeResults(await runMvpWriteProbe(user.uid));
    } catch (error) {
      setProbeResults([
        {
          detail: error instanceof Error ? error.message : "저장 권한 검사에 실패했습니다.",
          label: "저장 권한 검사",
          ok: false,
        },
      ]);
    } finally {
      setIsRunningProbe(false);
    }
  }

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

      <Card className="lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-brand-soft p-3 text-brand">
              <FloppyDisk size={24} weight="bold" />
            </span>
            <div>
              <h3 className="text-base font-bold">저장 권한 검사</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                현재 로그인 계정으로 캘린더, 메모, 투표, 채팅방 저장을 실제로
                시도하고 자동 삭제합니다.
              </p>
            </div>
          </div>
          <Button disabled={isRunningProbe} onClick={handleRunWriteProbe}>
            {isRunningProbe ? "검사 중" : "검사 실행"}
          </Button>
        </div>

        {probeResults.length > 0 && (
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {probeResults.map((result) => (
              <li
                className="rounded-2xl bg-[var(--color-surface-muted)] p-4"
                key={result.label}
              >
                <div className="flex items-start gap-3">
                  <StatusIcon status={result.ok ? "ok" : "warning"} />
                  <div className="min-w-0">
                    <strong className="block text-sm">{result.label}</strong>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">
                      {result.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-brand-soft p-3 text-brand">
              <ClipboardText size={24} weight="bold" />
            </span>
            <div>
              <h3 className="text-base font-bold">MVP 수동 테스트</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                {completedCount}/{smokeChecklistItems.length}개 확인됨
              </p>
            </div>
          </div>
          <Button onClick={resetChecklist} variant="secondary">
            초기화
          </Button>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{
              width: `${Math.round(
                (completedCount / smokeChecklistItems.length) * 100
              )}%`,
            }}
          />
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {smokeChecklistItems.map((item) => (
            <li key={item}>
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm font-semibold leading-5 transition hover:bg-slate-200">
                <input
                  checked={checkedItems.has(item)}
                  className="mt-0.5 size-4 shrink-0 accent-emerald-500"
                  onChange={() => toggleChecklistItem(item)}
                  type="checkbox"
                />
                <span className="text-[var(--color-text-primary)]">{item}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>
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
      {
        detail: getShortCommit(buildInfo.commit),
        label: "Build Commit",
        status: buildInfo.commit === "local" ? "warning" : "ok",
      },
      {
        detail: formatBuildTime(buildInfo.time),
        label: "Build Time",
        status: buildInfo.time === "local" ? "warning" : "ok",
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

function formatBuildTime(value: string) {
  if (value === "local") {
    return "local";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readStoredChecklist() {
  try {
    const storedItems = JSON.parse(
      window.localStorage.getItem(smokeChecklistStorageKey) ?? "[]"
    );

    if (!Array.isArray(storedItems)) {
      return new Set<string>();
    }

    return new Set(
      storedItems.filter(
        (item): item is string =>
          typeof item === "string" && smokeChecklistItems.includes(item)
      )
    );
  } catch {
    return new Set<string>();
  }
}
