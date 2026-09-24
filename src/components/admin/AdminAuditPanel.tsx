import {
  ArrowCounterClockwise,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  DownloadSimple,
  FunnelSimple,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { useToast } from "../common/toastContext";
import type { AdminPageCursor } from "../../features/admin/services/adminDashboardService";
import {
  loadAdminAuditLogsForExport,
  loadAdminAuditLogsPage,
} from "../../features/admin/services/adminAuditService";
import {
  adminAuditActionLabels,
  type AdminAuditAction,
  type AdminAuditLog,
} from "../../features/admin/types/adminAuditTypes";
import {
  buildAdminAuditCsvFilename,
  formatAdminAuditCsv,
  getDefaultAdminAuditFilters,
  type AdminAuditFilters,
} from "../../features/admin/utils/adminAuditFilters";
import { platformAdminRoleLabels } from "../../features/admin/types/platformAdminTypes";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

export function AdminAuditPanel() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [draftFilters, setDraftFilters] = useState<AdminAuditFilters>(getDefaultAdminAuditFilters);
  const [filters, setFilters] = useState<AdminAuditFilters>(getDefaultAdminAuditFilters);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<AdminPageCursor[]>([null]);
  const [nextCursor, setNextCursor] = useState<AdminPageCursor>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const cursor = cursors[pageIndex] ?? null;
  useEffect(() => {
    let isActive = true;

    void loadAdminAuditLogsPage({ cursor, filters })
      .then((page) => {
        if (!isActive) return;
        setLogs(page.items);
        setHasNext(page.hasNext);
        setNextCursor(page.nextCursor);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setLogs([]);
        setHasNext(false);
        setNextCursor(null);
        setErrorMessage(getFirebaseErrorMessage(error));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [cursor, filters]);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
      showToast({ message: "시작일은 종료일보다 빠르게 선택해주세요.", variant: "error" });
      return;
    }

    resetPagination();
    setFilters({ ...draftFilters, query: draftFilters.query.trim() });
  }

  function handleResetFilters() {
    const nextFilters = getDefaultAdminAuditFilters();
    setDraftFilters(nextFilters);
    resetPagination();
    setFilters(nextFilters);
  }

  function resetPagination() {
    setIsLoading(true);
    setPageIndex(0);
    setCursors([null]);
    setNextCursor(null);
    setHasNext(false);
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const result = await loadAdminAuditLogsForExport({ filters });
      if (result.items.length === 0) {
        showToast({ message: "내보낼 운영 기록이 없어요.", variant: "info" });
        return;
      }

      downloadCsv(formatAdminAuditCsv(result.items), buildAdminAuditCsvFilename());
      showToast({
        message: result.truncated
          ? "최대 5,000건까지 CSV로 저장했어요. 기간을 좁히면 나머지도 받을 수 있어요."
          : `${result.items.length.toLocaleString("ko-KR")}건을 CSV로 저장했어요.`,
        variant: result.truncated ? "info" : "success",
      });
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-brand">History</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">감사 로그</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            운영자가 변경한 내용을 시간순으로 확인해요.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={isLoading || isExporting}
          loading={isExporting}
          onClick={() => void handleExport()}
          type="button"
          variant="secondary"
        >
          <DownloadSimple size={18} weight="regular" />
          CSV 내보내기
        </Button>
      </header>

      <form
        className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        onSubmit={handleApplyFilters}
      >
        <div className="flex items-center gap-2">
          <FunnelSimple className="text-brand" size={19} weight="regular" />
          <h3 className="text-base font-semibold">조회 조건</h3>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          검색
          <span className="flex h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-brand focus-within:ring-4 focus-within:ring-emerald-100">
            <MagnifyingGlass className="shrink-0 text-[var(--color-text-secondary)]" size={18} />
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-normal text-[var(--color-text-primary)] outline-none placeholder:text-slate-400"
              inputMode="search"
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="작업자·대상 ID 또는 설명 검색"
              value={draftFilters.query}
            />
          </span>
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">
            작업
            <select
              className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  action: event.target.value as AdminAuditAction | "ALL",
                }))
              }
              value={draftFilters.action}
            >
              <option value="ALL">전체 작업</option>
              {Object.entries(adminAuditActionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            시작일
            <input
              className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, startDate: event.target.value }))
              }
              type="date"
              value={draftFilters.startDate}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            종료일
            <input
              className="h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-base font-normal text-[var(--color-text-primary)] outline-none focus:border-brand focus:ring-4 focus:ring-emerald-100"
              min={draftFilters.startDate || undefined}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, endDate: event.target.value }))
              }
              type="date"
              value={draftFilters.endDate}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button onClick={handleResetFilters} type="button" variant="secondary">
            <ArrowCounterClockwise size={17} weight="regular" />
            초기화
          </Button>
          <Button disabled={isLoading} type="submit">
            <FunnelSimple size={17} weight="regular" />
            조회
          </Button>
        </div>
        <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
          기본 조회 범위는 최근 30일이에요. 검색 범위를 좁히면 더 빠르게 확인할 수 있어요.
        </p>
      </form>

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
            <strong className="mt-3 text-base">조건에 맞는 운영 기록이 없어요.</strong>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              검색어나 기간을 바꿔 다시 확인해보세요.
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

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
