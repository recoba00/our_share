import { CaretLeft, CaretRight, ClockCounterClockwise } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import type { AdminPageCursor } from "../../features/admin/services/adminDashboardService";
import { loadAdminAuditLogsPage } from "../../features/admin/services/adminAuditService";
import {
  adminAuditActionLabels,
  type AdminAuditLog,
} from "../../features/admin/types/adminAuditTypes";
import { platformAdminRoleLabels } from "../../features/admin/types/platformAdminTypes";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

export function AdminAuditPanel() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<AdminPageCursor[]>([null]);
  const [nextCursor, setNextCursor] = useState<AdminPageCursor>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const cursor = cursors[pageIndex] ?? null;
  useEffect(() => {
    let isActive = true;

    void loadAdminAuditLogsPage({ cursor })
      .then((page) => {
        if (!isActive) return;
        setLogs(page.items);
        setHasNext(page.hasNext);
        setNextCursor(page.nextCursor);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (isActive) setErrorMessage(getFirebaseErrorMessage(error));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [cursor]);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase text-brand">History</p>
        <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">감사 로그</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          운영자가 변경한 내용을 시간순으로 확인해요.
        </p>
      </header>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {isLoading ? <LoadingRows /> : null}
        {!isLoading && logs.length === 0 ? (
          <div className="grid place-items-center px-4 py-14 text-center">
            <ClockCounterClockwise className="text-brand" size={30} weight="regular" />
            <strong className="mt-3 text-base">아직 운영 기록이 없어요.</strong>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              공지·신고·권한 변경 내역이 여기에 쌓여요.
            </p>
          </div>
        ) : null}
        {!isLoading ? (
          <div className="divide-y divide-[var(--color-border)]">
            {logs.map((log) => (
              <article className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={log.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-semibold">{adminAuditActionLabels[log.action]}</strong>
                    <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
                      {platformAdminRoleLabels[log.actorRole]}
                    </span>
                  </div>
                  <p className="mt-1 break-words text-sm text-[var(--color-text-secondary)]">
                    {log.description}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">
                    작업자 {log.actorId} · 대상 {log.targetId}
                  </p>
                </div>
                <time className="text-xs text-[var(--color-text-secondary)]">
                  {formatTimestamp(log.createdAt)}
                </time>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <nav aria-label="감사 로그 페이지" className="flex items-center justify-center gap-3">
        <Button
          disabled={isLoading || pageIndex === 0}
          onClick={() => {
            setIsLoading(true);
            setPageIndex((current) => Math.max(0, current - 1));
          }}
          type="button"
          variant="secondary"
        >
          <CaretLeft size={16} weight="regular" />
          이전
        </Button>
        <span className="min-w-14 text-center text-sm font-semibold tabular-nums">{pageIndex + 1}페이지</span>
        <Button
          disabled={isLoading || !hasNext || !nextCursor}
          onClick={() => {
            if (!nextCursor) return;
            setIsLoading(true);
            setCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
            setPageIndex((current) => current + 1);
          }}
          type="button"
          variant="secondary"
        >
          다음
          <CaretRight size={16} weight="regular" />
        </Button>
      </nav>
    </div>
  );
}

function LoadingRows() {
  return (
    <div aria-label="감사 로그를 불러오는 중" className="grid gap-px" role="status">
      {[0, 1, 2, 3].map((index) => (
        <div className="h-24 animate-pulse bg-[var(--color-surface-muted)]" key={index} />
      ))}
    </div>
  );
}

function formatTimestamp(timestamp: { toDate: () => Date } | null) {
  if (!timestamp) return "방금 전";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}
