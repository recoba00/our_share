export function getFirebaseErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === "permission-denied") {
    return "이 기능을 사용할 권한이 없어요. 크루 참여 상태를 확인해주세요.";
  }

  if (code === "unavailable") {
    return "연결이 잠시 불안정해요. 다시 시도해주세요.";
  }

  if (code === "not-found") {
    return "요청한 정보를 찾을 수 없어요.";
  }

  if (code === "unauthenticated") {
    return "로그인이 필요해요. 다시 로그인해주세요.";
  }

  if (code === "failed-precondition") {
    return "아직 준비되지 않은 기능이에요. 잠시 후 다시 시도해주세요.";
  }

  if (error instanceof Error && error.message) {
    if (/missing or insufficient permissions/i.test(error.message)) {
      return "이 기능을 사용할 권한이 없어요. 크루 참여 상태를 확인해주세요.";
    }

    return error.message;
  }

  return "잠시 문제가 생겼어요. 다시 시도해주세요.";
}

function getFirebaseErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return "";
}
