import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, firebaseApp } from "../../../lib/firebase/app";

const pushDeviceStorageKey = "our-share:push-device-id";
const pushPreferenceStoragePrefix = "our-share:push-enabled";
const sessionPushPreferences = new Map<string, boolean>();
const defaultVapidKey =
  "BAEw5HTkUQ_cXnsqHU2W8bg3alE6ABFu3xV0QOfQwBu4DPGgS8RU8-1pWqrQuKK5Na4sf62ckMBAlKsJcZj-dbQ";

export type PushNotificationState =
  | "blocked"
  | "disabled"
  | "enabled"
  | "unsupported";

export async function getPushNotificationState(userId: string): Promise<PushNotificationState> {
  if (!(await supportsPushNotifications())) {
    return "unsupported";
  }

  if (Notification.permission === "denied") {
    return "blocked";
  }

  return Notification.permission === "granted" && isPushNotificationsEnabled(userId)
    ? "enabled"
    : "disabled";
}

export async function enablePushNotifications(userId: string) {
  if (!(await supportsPushNotifications())) {
    throw new Error("이 기기에서는 푸시 알림을 사용할 수 없어요.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "알림이 차단됐어요. 기기 설정에서 우리끼리 알림을 허용해주세요."
        : "알림 권한을 허용하면 새 소식을 받을 수 있어요."
    );
  }

  const token = await registerPushDevice(userId);
  setPushNotificationsEnabled(userId, true);
  return token;
}

export async function refreshPushDeviceRegistration(userId: string) {
  if (
    !isPushNotificationsEnabled(userId) ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return null;
  }

  if (!(await supportsPushNotifications())) {
    return null;
  }

  return registerPushDevice(userId);
}

export async function disablePushNotifications(userId: string) {
  setPushNotificationsEnabled(userId, false);
  const deviceId = readPushDeviceId();

  if (deviceId) {
    await deleteDoc(doc(db, "users", userId, "pushDevices", deviceId)).catch(() => {
      // 로그아웃과 알림 해제는 이미 삭제된 기기 문서와 무관하게 계속한다.
    });
  }

  try {
    const { deleteToken, getMessaging, isSupported } = await import("firebase/messaging");

    if (await isSupported()) {
      await deleteToken(getMessaging(firebaseApp));
    }
  } catch {
    // 브라우저 푸시 구독 정리에 실패해도 서버의 기기 문서를 지우면 발송 대상에서 제외된다.
  }
}

export function isPushNotificationsEnabled(userId: string) {
  const sessionPreference = sessionPushPreferences.get(userId);

  if (sessionPreference !== undefined) {
    return sessionPreference;
  }

  try {
    return window.localStorage.getItem(getPushPreferenceStorageKey(userId)) === "true";
  } catch {
    return false;
  }
}

async function registerPushDevice(userId: string) {
  const [{ getMessaging, getToken }, registration] = await Promise.all([
    import("firebase/messaging"),
    navigator.serviceWorker.ready,
  ]);
  const token = await getToken(getMessaging(firebaseApp), {
    serviceWorkerRegistration: registration,
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || defaultVapidKey,
  });

  if (!token) {
    throw new Error("푸시 알림 기기를 등록하지 못했어요. 잠시 후 다시 시도해주세요.");
  }

  const deviceId = getOrCreatePushDeviceId();
  const deviceRef = doc(db, "users", userId, "pushDevices", deviceId);
  const deviceSnapshot = await getDoc(deviceRef);

  await setDoc(
    deviceRef,
    {
      deviceId,
      enabled: true,
      platform: getPlatformName(),
      token,
      updatedAt: serverTimestamp(),
      ...(!deviceSnapshot.exists() ? { createdAt: serverTimestamp() } : {}),
    },
    { merge: true }
  );

  return token;
}

async function supportsPushNotifications() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !window.isSecureContext
  ) {
    return false;
  }

  try {
    const { isSupported } = await import("firebase/messaging");
    return isSupported();
  } catch {
    return false;
  }
}

function getOrCreatePushDeviceId() {
  const savedDeviceId = readPushDeviceId();

  if (savedDeviceId) {
    return savedDeviceId;
  }

  const nextDeviceId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;

  try {
    window.localStorage.setItem(pushDeviceStorageKey, nextDeviceId);
  } catch {
    // 저장소가 막힌 경우에도 현재 세션에서는 생성한 ID로 등록을 진행한다.
  }

  return nextDeviceId;
}

function readPushDeviceId() {
  try {
    return window.localStorage.getItem(pushDeviceStorageKey);
  } catch {
    return null;
  }
}

function setPushNotificationsEnabled(userId: string, enabled: boolean) {
  sessionPushPreferences.set(userId, enabled);

  try {
    window.localStorage.setItem(
      getPushPreferenceStorageKey(userId),
      enabled ? "true" : "false"
    );
  } catch {
    // 저장소가 막혀도 현재 세션에서는 메모리 설정을 사용한다.
  }
}

function getPushPreferenceStorageKey(userId: string) {
  return `${pushPreferenceStoragePrefix}:${userId}`;
}

function getPlatformName() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "IOS_PWA";
  }

  if (/android/.test(userAgent)) {
    return "ANDROID_WEB";
  }

  return "WEB";
}
