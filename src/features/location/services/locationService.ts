import { onValue, ref, set } from "firebase/database";
import { realtimeDb } from "../../../lib/firebase/app";
import { getFirebaseErrorMessage } from "../../../lib/firebase/firebaseErrorMessage";
import type { LiveLocation } from "../types/locationTypes";

export function subscribeFamilyLocations(
  familyId: string,
  callback: (locations: Record<string, LiveLocation>) => void,
  onError?: (message: string) => void
) {
  const locationsRef = ref(realtimeDb, `liveLocations/${familyId}`);

  return onValue(
    locationsRef,
    (snapshot) => {
      callback((snapshot.val() ?? {}) as Record<string, LiveLocation>);
    },
    (error) => {
      onError?.(getFirebaseErrorMessage(error));
    }
  );
}

export async function updateMyLiveLocation({
  familyId,
  location,
  userId,
}: {
  familyId: string;
  location: LiveLocation;
  userId: string;
}) {
  await set(ref(realtimeDb, `liveLocations/${familyId}/${userId}`), location);
}

export function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 공유를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 10_000,
    });
  });
}

export async function readBatteryStatus() {
  const batteryNavigator = navigator as Navigator & {
    getBattery?: () => Promise<{
      charging: boolean;
      level: number;
    }>;
  };

  if (!batteryNavigator.getBattery) {
    return {
      battery: null,
      charging: null,
    };
  }

  const battery = await batteryNavigator.getBattery();

  return {
    battery: Math.round(battery.level * 100),
    charging: battery.charging,
  };
}
