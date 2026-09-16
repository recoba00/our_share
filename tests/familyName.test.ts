import { describe, expect, it } from "vitest";
import {
  limitFamilyNameInput,
  MAX_FAMILY_NAME_LENGTH,
  truncateFamilyName,
} from "../src/features/family/utils/familyName";

describe("family name formatting", () => {
  it("limits input by Korean character count", () => {
    expect(limitFamilyNameInput("우리크루이름입니다")).toBe("우리크루이름입니");
    expect(Array.from(limitFamilyNameInput("우리크루이름입니다")).length).toBe(
      MAX_FAMILY_NAME_LENGTH
    );
  });

  it("keeps unicode characters intact when limiting input", () => {
    expect(limitFamilyNameInput("크루😀😀😀😀😀😀😀😀😀")).toBe("크루😀😀😀😀😀😀");
  });

  it("truncates existing long names with an ellipsis", () => {
    expect(truncateFamilyName("우리크루이름입니다")).toBe("우리크루이름입니...");
  });
});
