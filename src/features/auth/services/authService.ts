import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../../../lib/firebase/app";

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw new Error(getAuthErrorMessage(error));
  }
}

export async function syncRedirectLoginResult() {
  const result = await getRedirectResult(auth);

  if (!result?.user) {
    return null;
  }

  await syncUserProfile(result.user);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export async function syncUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      updatedAt: serverTimestamp(),
      ...(!userSnapshot.exists() ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );
}

export function getAuthErrorMessage(error: unknown) {
  const code = getFirebaseAuthCode(error);

  if (code === "auth/unauthorized-domain") {
    return "Firebase Auth 승인 도메인에 현재 접속 도메인을 추가해야 합니다. Firebase Console > Authentication > Settings > 승인된 도메인에 recoba00.dothome.co.kr를 추가해주세요.";
  }

  if (code === "auth/operation-not-allowed") {
    return "Firebase Console > Authentication > Sign-in method에서 Google 로그인을 활성화해야 합니다.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "Google 로그인 창이 완료 전에 닫혔습니다. 다시 시도해주세요.";
  }

  if (code === "auth/popup-blocked") {
    return "브라우저가 로그인 팝업을 차단했습니다. redirect 로그인으로 다시 시도합니다.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Google 로그인 중 오류가 발생했습니다.";
}

function shouldFallbackToRedirect(error: unknown) {
  const code = getFirebaseAuthCode(error);
  return code === "auth/popup-blocked" || code === "auth/cancelled-popup-request";
}

function getFirebaseAuthCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  return "";
}
