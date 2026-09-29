import type { Memo } from "../types/memoTypes";

export function mergeMemos(...memoGroups: Memo[][]) {
  return memoGroups
    .flat()
    .filter(
      (memo, index, allMemos) =>
        allMemos.findIndex((nextMemo) => nextMemo.id === memo.id) === index
    )
    .sort((a, b) => getTimestampMilliseconds(b.updatedAt) - getTimestampMilliseconds(a.updatedAt));
}

function getTimestampMilliseconds(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object") {
    if ("toMillis" in value && typeof value.toMillis === "function") {
      return value.toMillis();
    }

    if ("seconds" in value && typeof value.seconds === "number") {
      return Number(value.seconds) * 1000;
    }
  }

  return 0;
}
