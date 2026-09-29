import type { ServiceNotice } from "../types/serviceNoticeTypes";

type NoticeOrderField = "publishedAt" | "updatedAt";

export function mergeServiceNotices(
  orderField: NoticeOrderField,
  ...noticeGroups: ServiceNotice[][]
) {
  return noticeGroups
    .flat()
    .filter(
      (notice, index, allNotices) =>
        allNotices.findIndex((nextNotice) => nextNotice.id === notice.id) === index
    )
    .sort(
      (first, second) =>
        getTimestampMilliseconds(second[orderField]) -
        getTimestampMilliseconds(first[orderField])
    );
}

export function getNoticesLeavingRecentWindow(
  previousNotices: ServiceNotice[],
  nextNotices: ServiceNotice[]
) {
  const nextNoticeIds = new Set(nextNotices.map((notice) => notice.id));

  return previousNotices.filter((notice) => !nextNoticeIds.has(notice.id));
}

function getTimestampMilliseconds(value: ServiceNotice[NoticeOrderField]) {
  return value?.toMillis() ?? 0;
}
