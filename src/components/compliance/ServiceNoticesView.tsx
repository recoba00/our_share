import { useEffect, useState } from "react";
import { subscribePublishedServiceNotices } from "../../features/admin/services/serviceNoticeService";
import type { ServiceNotice } from "../../features/admin/types/serviceNoticeTypes";
import { policyDocuments } from "../../features/compliance/policyDocuments";

export function ServiceNoticesView() {
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(
    () =>
      subscribePublishedServiceNotices({
        onChange: (nextNotices) => {
          setNotices(nextNotices);
          setErrorMessage("");
          setIsLoading(false);
        },
        onError: (message) => {
          setErrorMessage(message);
          setIsLoading(false);
        },
      }),
    []
  );

  return (
    <div className="policy-scroll-mask">
      <div
        aria-label="공지사항 내용"
        className="policy-scroll-region grid gap-3"
        role="region"
        tabIndex={0}
      >
        {isLoading ? (
          <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-secondary)]">
            공지를 불러오는 중이에요.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-400/10 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}
        {!isLoading && !errorMessage && notices.length === 0 ? (
          <section className="grid gap-2 rounded-xl bg-[var(--color-surface-muted)] p-4">
            <h3 className="text-base font-semibold">{policyDocuments.notices.sections[0].title}</h3>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              {policyDocuments.notices.sections[0].body}
            </p>
          </section>
        ) : null}
        {notices.map((notice) => (
          <article className="grid gap-2 rounded-xl bg-[var(--color-surface-muted)] p-4" key={notice.id}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 flex-1 text-base font-semibold">{notice.title}</h3>
              <time className="shrink-0 text-xs text-[var(--color-text-secondary)]">
                {formatNoticeDate(notice.publishedAt)}
              </time>
            </div>
            <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-text-secondary)]">
              {notice.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatNoticeDate(timestamp: ServiceNotice["publishedAt"]) {
  if (!timestamp) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp.toDate());
}
