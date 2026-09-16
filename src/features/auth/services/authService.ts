import {
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { remove, ref } from "firebase/database";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db, googleProvider, realtimeDb } from "../../../lib/firebase/app";

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
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
  return result?.user ?? null;
}

export async function logout() {
  const user = auth.currentUser;

  if (user) {
    try {
      const memberSnapshot = await getDocs(
        query(collection(db, "familyMembers"), where("userId", "==", user.uid))
      );

      await Promise.all(
        memberSnapshot.docs.map((memberDoc) =>
          clearUserRealtimeData(memberDoc.data().familyId as string, user.uid)
        )
      );
      await Promise.all(
        memberSnapshot.docs.map((memberDoc) =>
          remove(ref(realtimeDb, `familyMembers/${memberDoc.data().familyId}/${user.uid}`))
        )
      );
    } catch {
      // 로그아웃은 정리 실패와 무관하게 완료되어야 한다.
    }
  }

  await signOut(auth);
}

export async function deleteAccount({
  ownedFamilyIds = [],
  user,
}: {
  ownedFamilyIds?: string[];
  user: User;
}) {
  if (ownedFamilyIds.length > 0) {
    throw new Error("크루장인 크루를 먼저 삭제한 뒤 탈퇴할 수 있어요.");
  }

  await reauthenticateWithPopup(user, googleProvider);

  const memberSnapshot = await getDocs(
    query(collection(db, "familyMembers"), where("userId", "==", user.uid))
  );

  await Promise.all(
    memberSnapshot.docs.map((memberDoc) =>
      clearUserRealtimeData(memberDoc.data().familyId as string, user.uid)
    )
  );

  const batch = writeBatch(db);
  batch.delete(doc(db, "users", user.uid));
  memberSnapshot.docs.forEach((memberDoc) => batch.delete(memberDoc.ref));
  await batch.commit();

  await Promise.all(
    memberSnapshot.docs.map((memberDoc) =>
      remove(ref(realtimeDb, `familyMembers/${memberDoc.data().familyId}/${user.uid}`))
    )
  );
  await deleteUser(user);
}

async function clearUserRealtimeData(familyId: string, userId: string) {
  await Promise.all([
    remove(ref(realtimeDb, `liveLocations/${familyId}/${userId}`)),
    remove(ref(realtimeDb, `onlinePresence/${familyId}/${userId}`)),
    remove(ref(realtimeDb, `deviceStatus/${familyId}/${userId}`)),
  ]);
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

export async function updateUserProfile({
  displayName,
  photoURL,
  user,
}: {
  displayName: string;
  photoURL: string;
  user: User;
}) {
  const normalizedDisplayName = displayName.trim();
  const normalizedPhotoURL = photoURL.trim();

  if (!normalizedDisplayName) {
    throw new Error("닉네임을 적어주세요.");
  }

  await updateProfile(user, {
    displayName: normalizedDisplayName,
    photoURL: normalizedPhotoURL || null,
  });

  await setDoc(
    doc(db, "users", user.uid),
    {
      id: user.uid,
      displayName: normalizedDisplayName,
      email: user.email,
      photoURL: normalizedPhotoURL || null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function getAuthErrorMessage(error: unknown) {
  const code = getFirebaseAuthCode(error);

  if (code === "auth/unauthorized-domain") {
    const currentHost = typeof window !== "undefined" ? window.location.hostname : "our-share-6baf5.web.app";

    return `현재 주소(${currentHost})에서는 로그인할 수 없어요. Firebase 승인된 도메인에 추가해주세요.`;
  }

  if (code === "auth/operation-not-allowed") {
    return "Google 로그인이 아직 켜지지 않았어요. Firebase 설정을 확인해주세요.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "로그인 창이 닫혔어요. 다시 시도해주세요.";
  }

  if (code === "auth/popup-blocked") {
    return "로그인 창을 열 수 없어요. 다시 시도해주세요.";
  }

  if (code === "auth/requires-recent-login") {
    return "보안을 위해 Google 로그인을 다시 확인해주세요.";
  }

  if (error instanceof Error && error.message && !error.message.startsWith("Firebase:")) {
    return error.message;
  }

  return "로그인에 문제가 생겼어요. 다시 시도해주세요.";
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
