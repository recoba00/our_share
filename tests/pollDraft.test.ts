import { describe, expect, it } from "vitest";
import {
  getNormalizedPollOptions,
  hasDuplicatePollOptions,
} from "../src/features/poll/utils/pollDraft";

describe("poll draft option validation", () => {
  it("trims options and removes empty draft values", () => {
    expect(getNormalizedPollOptions([" 치킨 ", "", "   ", "피자"])).toEqual([
      "치킨",
      "피자",
    ]);
  });

  it("detects duplicated non-empty options after trimming", () => {
    expect(hasDuplicatePollOptions(["치킨", " 피자 ", "치킨"])).toBe(true);
    expect(hasDuplicatePollOptions(["치킨", "피자", ""])).toBe(false);
  });
});
