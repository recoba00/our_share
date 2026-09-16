import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentPosition,
  readBatteryStatus,
  stopMyLiveLocationShare,
  updateMyLiveLocation,
} from "../services/locationService";

type LocationShareStatus = "idle" | "loading" | "success" | "error";

export type LocationShareController = {
  isShared: boolean;
  isSharing: boolean;
  message: string;
  clearMessage: () => void;
  shareCurrentLocation: () => Promise<void>;
  stopCurrentLocationShare: () => Promise<void>;
  status: LocationShareStatus;
};

export function useMyLocationShare({
  familyId,
  userId,
}: {
  familyId: string | null;
  userId: string | null;
}) {
  const [status, setStatus] = useState<LocationShareStatus>("idle");
  const [message, setMessage] = useState("");
  const [sharedFamilyId, setSharedFamilyId] = useState<string | null>(null);
  const lastSentPositionRef = useRef<SentPosition | null>(null);
  const isSendingRef = useRef(false);
  const clearMessage = useCallback(() => setMessage(""), []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!familyId || !userId) {
        setSharedFamilyId(null);
        return;
      }

      setSharedFamilyId(readSharingPreference(userId, familyId) ? familyId : null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [familyId, userId]);

  const shareCurrentLocation = useCallback(async () => {
    if (!familyId || !userId) {
      setStatus("error");
      setMessage("크루에 참여한 뒤 위치를 공유할 수 있어요.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const [position, battery] = await Promise.all([
        getCurrentPosition(),
        readBatteryStatus(),
      ]);

      await updateMyLiveLocation({
        familyId,
        userId,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Date.now(),
          battery: battery.battery,
          charging: battery.charging,
        },
      });

      lastSentPositionRef.current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        sentAt: Date.now(),
      };
      setSharedFamilyId(familyId);
      writeSharingPreference(userId, familyId, true);
      setStatus("success");
      setMessage("현재 위치를 공유하고 있어요.");
    } catch (error) {
      setStatus("error");
      setMessage(getLocationErrorMessage(error));
    }
  }, [familyId, userId]);

  const stopCurrentLocationShare = useCallback(async () => {
    if (!familyId || !userId) {
      setStatus("error");
      setMessage("크루에 참여한 뒤 위치 공유를 끌 수 있어요.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await stopMyLiveLocationShare({ familyId, userId });
      setSharedFamilyId(null);
      lastSentPositionRef.current = null;
      writeSharingPreference(userId, familyId, false);
      setStatus("idle");
      setMessage("위치 공유를 껐어요.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "위치 공유를 끄지 못했어요.");
    }
  }, [familyId, userId]);

  useEffect(() => {
    if (!familyId || !userId || sharedFamilyId !== familyId) {
      return;
    }

    const activeFamilyId = familyId;
    const activeUserId = userId;

    if (!navigator.geolocation) {
      return;
    }

    let active = true;

    async function syncIfMoved(position: GeolocationPosition) {
      if (!active || isSendingRef.current) {
        return;
      }

      const nextPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const previousPosition = lastSentPositionRef.current;
      const elapsedMs = previousPosition ? Date.now() - previousPosition.sentAt : 10_000;
      const movedMeters = previousPosition
        ? getDistanceInMeters(previousPosition, nextPosition)
        : Number.POSITIVE_INFINITY;

      if (elapsedMs < 10_000 || movedMeters < 20) {
        return;
      }

      isSendingRef.current = true;

      try {
        const battery = await readBatteryStatus();

        await updateMyLiveLocation({
          familyId: activeFamilyId,
          userId: activeUserId,
          location: {
            latitude: nextPosition.latitude,
            longitude: nextPosition.longitude,
            accuracy: position.coords.accuracy,
            updatedAt: Date.now(),
            battery: battery.battery,
            charging: battery.charging,
          },
        });

        lastSentPositionRef.current = {
          ...nextPosition,
          sentAt: Date.now(),
        };
      } catch (error) {
        if (active) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "위치를 업데이트하지 못했어요.");
        }
      } finally {
        isSendingRef.current = false;
      }
    }

    function handlePositionError(error: GeolocationPositionError) {
      if (!active) {
        return;
      }

      setStatus("error");
      setMessage(getLocationErrorMessage(error));
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => void syncIfMoved(position),
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    );

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        navigator.geolocation.getCurrentPosition(
          (position) => void syncIfMoved(position),
          () => {
            // watchPosition이 다음 위치 변경에서 다시 시도한다.
          },
          { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
        );
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [familyId, sharedFamilyId, userId]);

  return useMemo(
    () => ({
      isShared: sharedFamilyId === familyId,
      isSharing: status === "loading",
      message,
      clearMessage,
      shareCurrentLocation,
      stopCurrentLocationShare,
      status,
    }),
    [
      clearMessage,
      familyId,
      message,
      sharedFamilyId,
      shareCurrentLocation,
      status,
      stopCurrentLocationShare,
    ]
  );
}

type SentPosition = {
  latitude: number;
  longitude: number;
  sentAt: number;
};

type Coordinates = Pick<SentPosition, "latitude" | "longitude">;

function getDistanceInMeters(from: Coordinates, to: Coordinates) {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeFrom = toRadians(from.latitude);
  const latitudeTo = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeFrom) * Math.cos(latitudeTo) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getSharingStorageKey(userId: string, familyId: string) {
  return `our-share-location-sharing:${userId}:${familyId}`;
}

function readSharingPreference(userId: string, familyId: string) {
  try {
    return window.localStorage.getItem(getSharingStorageKey(userId, familyId)) === "true";
  } catch {
    return false;
  }
}

function writeSharingPreference(userId: string, familyId: string, isSharing: boolean) {
  try {
    if (isSharing) {
      window.localStorage.setItem(getSharingStorageKey(userId, familyId), "true");
    } else {
      window.localStorage.removeItem(getSharingStorageKey(userId, familyId));
    }
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 현재 세션의 위치 공유는 계속한다.
  }
}

function getLocationErrorMessage(error: unknown) {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요.";
    }

    if (error.code === error.TIMEOUT) {
      return "위치를 확인하지 못했어요. 다시 시도해주세요.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "위치 공유에 문제가 생겼어요. 다시 시도해주세요.";
}
