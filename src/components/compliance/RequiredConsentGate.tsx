import type { PropsWithChildren } from "react";
import { ConsentSheet } from "./ConsentSheet";
import { hasRequiredConsent, saveRequiredConsent } from "../../features/compliance/consentStorage";
import { useAuth } from "../../features/auth/useAuth";
import { syncUserProfile } from "../../features/auth/services/authService";
import { useState } from "react";

export function RequiredConsentGate({ children }: PropsWithChildren) {
  const { status, user } = useAuth();
  const [accepted, setAccepted] = useState(false);

  if (status !== "authenticated" || accepted || hasRequiredConsent()) {
    return children;
  }

  return (
    <ConsentSheet
      actionLabel="동의하고 계속하기"
      blocking
      isOpen
      onAccept={() => {
        saveRequiredConsent();
        setAccepted(true);
        if (user) {
          void syncUserProfile(user).catch(() => undefined);
        }
      }}
      onClose={() => undefined}
    />
  );
}
