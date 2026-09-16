import { ArrowClockwise, DownloadSimple, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../common/Button";
import { IconButton } from "../common/IconButton";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallDismissed, setIsInstallDismissed] = useState(
    () => localStorage.getItem("our-share:pwa-install-dismissed") === "true"
  );
  const [isUpdateReady, setIsUpdateReady] = useState(false);
  const platform = useMemo(getPlatform, []);
  const shouldShowInstall =
    !isUpdateReady &&
    !isInstallDismissed &&
    !isStandalone() &&
    (platform === "ios" || Boolean(installPrompt));

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleUpdateReady() {
      setIsUpdateReady(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("our-share:pwa-update-ready", handleUpdateReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("our-share:pwa-update-ready", handleUpdateReady);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    dismissInstall();
  }

  function dismissInstall() {
    localStorage.setItem("our-share:pwa-install-dismissed", "true");
    setIsInstallDismissed(true);
  }

  function reloadForUpdate() {
    void navigator.serviceWorker.getRegistration().then((registration) => {
      const waitingWorker = registration?.waiting;

      if (!waitingWorker || !navigator.serviceWorker) {
        window.location.reload();
        return;
      }

      let hasReloaded = false;
      const reloadAfterActivation = () => {
        if (hasReloaded) {
          return;
        }

        hasReloaded = true;
        navigator.serviceWorker.removeEventListener("controllerchange", reloadAfterActivation);
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener("controllerchange", reloadAfterActivation, {
        once: true,
      });
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(reloadAfterActivation, 5000);
    });
  }

  if (!shouldShowInstall && !isUpdateReady) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-24 z-40 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:left-1/2 lg:right-auto lg:w-[420px] lg:-translate-x-1/2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold">
            {isUpdateReady ? "새 버전이 준비됐어요" : "홈 화면에 추가하세요"}
          </p>
          <p className="mt-1 text-sm font-normal leading-6 text-[var(--color-text-secondary)]">
            {isUpdateReady
              ? "업데이트 후 새로고침하면 최신 변경사항을 바로 볼 수 있습니다."
              : platform === "ios"
                ? "공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요."
                : "앱처럼 빠르게 열 수 있도록 홈 화면에 설치할 수 있습니다."}
          </p>
        </div>
        {!isUpdateReady ? (
          <IconButton className="size-8 shrink-0" label="닫기" onClick={dismissInstall} variant="ghost">
            <X size={18} />
          </IconButton>
        ) : null}
      </div>
      <div className="mt-4">
        {isUpdateReady ? (
          <Button className="w-full" onClick={reloadForUpdate}>
            <ArrowClockwise size={18} />
            업데이트하고 새로고침
          </Button>
        ) : platform === "ios" ? (
          <Button className="w-full" onClick={dismissInstall} variant="secondary">
            확인
          </Button>
        ) : (
          <Button className="w-full" onClick={() => void handleInstall()}>
            <DownloadSimple size={18} />
            홈 화면에 추가
          </Button>
        )}
      </div>
    </div>
  );
}

function getPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);

  return isIos ? "ios" : "other";
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean(navigator.standalone));
}
