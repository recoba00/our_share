import {
  CaretLeft,
  CaretRight,
  CheckCircle,
  Flag,
  XCircle,
} from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { ActionLayer } from "../common/ActionLayer";
import { Button } from "../common/Button";
import { SegmentedControl } from "../common/SegmentedControl";
import { useToast } from "../common/toastContext";
import type { AdminPageCursor } from "../../features/admin/services/adminDashboardService";
import { useAuth } from "../../features/auth/useAuth";
import {
  loadModerationReportsPage,
  resolveModerationReport,
} from "../../features/moderation/services/moderationService";
import {
  moderationReasonLabels,
  moderationTargetLabels,
  type ModerationReport,
  type ModerationReportStatus,
} from "../../features/moderation/types/moderationTypes";
import { getFirebaseErrorMessage } from "../../lib/firebase/firebaseErrorMessage";

type ModerationView = "QUEUE" | "HISTORY";

export function ModerationPanel() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [view, setView] = useState<ModerationView>("QUEUE");
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<AdminPageCursor[]>([null]);
  const [nextCursor, setNextCursor] = useState<AdminPageCursor>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [resolutionStatus, setResolutionStatus] =
    useState<Exclude<ModerationReportStatus, "OPEN">>("RESOLVED");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const cursor = cursors[pageIndex] ?? null;
  useEffect(() => {
    let isActive = true;

    void loadModerationReportsPage({ cursor, view })
      .then((page) => {
        if (!isActive) {
          return;
        }
        setReports(page.items);
        setHasNext(page.hasNext);
        setNextCursor(page.nextCursor);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(getFirebaseErrorMessage(error));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [cursor, refreshKey, view]);

  function changeView(nextView: ModerationView) {
    setIsLoading(true);
    if (nextView === view) {
      setRefreshKey((current) => current + 1);
      return;
    }
    setView(nextView);
    setPageIndex(0);
    setCursors([null]);
  }

  function showNextPage() {
    if (!nextCursor) {
      return;
    }
    setIsLoading(true);
    setCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((current) => current + 1);
  }

  function showPreviousPage() {
    setIsLoading(true);
    setPageIndex((current) => Math.max(0, current - 1));
  }

  function openResolution(report: ModerationReport) {
    setSelectedReport(report);
    setResolutionStatus("RESOLVED");
    setResolutionNote("");
  }

  async function handleResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selectedReport) {
      return;
    }

    setIsResolving(true);
    try {
      await resolveModerationReport({
        reportId: selectedReport.id,
        resolutionNote,
        reviewedBy: user.uid,
        status: resolutionStatus,
      });
      setSelectedReport(null);
      setIsLoading(true);
      setPageIndex(0);
      setCursors([null]);
      setRefreshKey((current) => current + 1);
      showToast({
        message: resolutionStatus === "RESOLVED" ? "신고를 처리했어요." : "신고를 종료했어요.",
        variant: "success",
      });
    } catch (error) {
      showToast({ message: getFirebaseErrorMessage(error), variant: "error" });
    } finally {
      setIsResolving(false);
    }
  }

  return (
    <>
      <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 sm:p-6 lg:p-8">
        <header>
          <p className="text-xs font-semibold uppercase text-brand">Safety</p>
          <h2 className="mt-1 text-2xl font-semibold sm:text-3xl">신고 관리</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            접수된 신고를 확인하고 처리 결과를 기록해요.
          </p>
        </header>

        <div className="max-w-md">
          <SegmentedControl
            onChange={changeView}
            options={[
              { label: "처리 대기", value: "QUEUE" },
              { label: "전체 기록", value: "HISTORY" },
            ]}
            value={view}
          />
        </div>

        {errorMessage ? (
          <p className="rounded-lg bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <section className="grid gap-3">
          {isLoading ? <LoadingReports /> : null}
          {!isLoading && reports.length === 0 ? (
            <div className="grid place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-14 text-center">
              <Flag className="text-brand" size={30} weight="regular" />
              <strong className="mt-3 text-base">
                {view === "QUEUE" ? "처리할 신고가 없어요." : "신고 기록이 없어요."}
              </strong>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {view === "QUEUE" ? "새 신고가 접수되면 여기에 표시돼요." : "처리 내역을 확인할 수 있어요."}
              </p>
            </div>
          ) : null}
          {!isLoading
            ? reports.map((report) => (
                <article
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5"
                  key={report.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={report.status} />
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {formatTimestamp(report.createdAt)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-semibold">
                        {moderationTargetLabels[report.targetType]} · {report.targetLabel}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        {moderationReasonLabels[report.reason]} · 신고자 {report.reporterName}
                      </p>
                    </div>
                    {report.status === "OPEN" ? (
                      <Button onClick={() => openResolution(report)} type="button" variant="secondary">
                        처리하기
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-4 whitespace-pre-line rounded-lg bg-[var(--color-surface-muted)] p-4 text-sm leading-6">
                    {report.details}
                  </p>
                  {report.familyName ? (
                    <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                      접수 크루: {report.familyName}
                    </p>
                  ) : null}
                  {report.resolutionNote ? (
                    <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                      처리 메모: {report.resolutionNote}
                    </p>
                  ) : null}
                </article>
              ))
            : null}
        </section>

        <nav aria-label="신고 목록 페이지" className="flex items-center justify-center gap-3">
          <Button
            disabled={isLoading || pageIndex === 0}
            onClick={showPreviousPage}
            type="button"
            variant="secondary"
          >
            <CaretLeft size={16} weight="regular" />
            이전
          </Button>
          <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
            {pageIndex + 1}페이지
          </span>
          <Button
            disabled={isLoading || !hasNext}
            onClick={showNextPage}
            type="button"
            variant="secondary"
          >
            다음
            <CaretRight size={16} weight="regular" />
          </Button>
        </nav>
      </div>

      <ActionLayer
        desktop
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="신고 처리"
      >
        <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleResolve}>
          <SegmentedControl
            onChange={setResolutionStatus}
            options={[
              { label: "처리 완료", value: "RESOLVED" },
              { label: "문제 없음", value: "DISMISSED" },
            ]}
            value={resolutionStatus}
          />
          <label className="grid gap-2 text-sm font-semibold">
            처리 메모
            <textarea
              autoFocus
              className="min-h-48 resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base font-normal leading-6 text-[var(--color-text-primary)] outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-emerald-100"
              maxLength={500}
              onChange={(event) => setResolutionNote(event.target.value)}
              placeholder="확인한 내용이나 처리 결과를 적어주세요."
              value={resolutionNote}
            />
          </label>
          <Button disabled={isResolving} loading={isResolving} type="submit">
            저장하기
          </Button>
        </form>
      </ActionLayer>
    </>
  );
}

function StatusBadge({ status }: { status: ModerationReportStatus }) {
  const styles = {
    DISMISSED: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    OPEN: "bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  }[status];
  const label = { DISMISSED: "문제 없음", OPEN: "처리 대기", RESOLVED: "처리 완료" }[status];
  const Icon = status === "RESOLVED" ? CheckCircle : status === "DISMISSED" ? XCircle : Flag;

  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold ${styles}`}>
      <Icon size={14} weight="regular" />
      {label}
    </span>
  );
}

function LoadingReports() {
  return (
    <div aria-label="신고를 불러오는 중" className="grid gap-3" role="status">
      {[0, 1, 2].map((index) => (
        <div className="h-40 animate-pulse rounded-lg bg-[var(--color-surface-muted)]" key={index} />
      ))}
    </div>
  );
}

function formatTimestamp(timestamp: { toDate: () => Date } | null) {
  if (!timestamp) {
    return "방금 전";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp.toDate());
}
