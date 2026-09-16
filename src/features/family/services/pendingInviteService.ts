const PENDING_INVITE_STORAGE_KEY = "our-share-pending-invite-code";

export function savePendingInviteCode(inviteCode: string) {
  try {
    window.localStorage.setItem(PENDING_INVITE_STORAGE_KEY, inviteCode);
  } catch {
    // 로그인 redirect 환경에서 저장소를 사용할 수 없어도 현재 URL로 참여를 시도한다.
  }
}

export function getPendingInviteCode() {
  try {
    const inviteCode = window.localStorage.getItem(PENDING_INVITE_STORAGE_KEY)?.trim().toUpperCase();

    return inviteCode && /^[A-Z0-9]{6}$/.test(inviteCode) ? inviteCode : null;
  } catch {
    return null;
  }
}

export function clearPendingInviteCode() {
  try {
    window.localStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 참여 완료는 유지한다.
  }
}
