import { describe, expect, it } from "vitest";
import { getFirebaseErrorMessage } from "../src/lib/firebase/firebaseErrorMessage";

describe("getFirebaseErrorMessage", () => {
  it.each(["permission-denied", "PERMISSION_DENIED", "permission_denied"])(
    "normalizes the Firebase permission code %s",
    (code) => {
      expect(getFirebaseErrorMessage({ code })).toBe(
        "이 기능을 사용할 권한이 없어요. 크루 참여 상태를 확인해주세요."
      );
    }
  );
});
