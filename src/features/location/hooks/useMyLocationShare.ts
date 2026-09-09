import { useState } from "react";
import {
  getCurrentPosition,
  readBatteryStatus,
  updateMyLiveLocation,
} from "../services/locationService";

type LocationShareStatus = "idle" | "loading" | "success" | "error";

export function useMyLocationShare({
  familyId,
  userId,
}: {
  familyId: string | null;
  userId: string | null;
}) {
  const [status, setStatus] = useState<LocationShareStatus>("idle");
  const [message, setMessage] = useState("");

  async function shareCurrentLocation() {
    if (!familyId || !userId) {
      setStatus("error");
      setMessage("가족 생성 또는 참여 후 위치를 공유할 수 있습니다.");
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

      setStatus("success");
      setMessage("현재 위치를 Realtime Database에 공유했습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(getLocationErrorMessage(error));
    }
  }

  return {
    isSharing: status === "loading",
    message,
    shareCurrentLocation,
    status,
  };
}

function getLocationErrorMessage(error: unknown) {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return "위치 권한이 거부되었습니다.";
    }

    if (error.code === error.TIMEOUT) {
      return "위치 확인 시간이 초과되었습니다.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "위치 공유 중 오류가 발생했습니다.";
}
