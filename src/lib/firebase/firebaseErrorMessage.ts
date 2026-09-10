export function getFirebaseErrorMessage(error: unknown) {
  const code = getFirebaseErrorCode(error);

  if (code === "permission-denied") {
    return "Firebase 권한 오류입니다. 로그인 상태와 가족 참여 상태를 확인해주세요.";
  }

  if (code === "unavailable") {
    return "Firebase 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.";
  }

  if (code === "not-found") {
    return "요청한 Firebase 데이터를 찾을 수 없습니다.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Firebase 처리 중 오류가 발생했습니다.";
}

function getFirebaseErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return "";
}
