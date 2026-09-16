import type { ButtonHTMLAttributes } from "react";
import { GoogleLogo } from "@phosphor-icons/react";
import { ConsentSheet } from "./ConsentSheet";
import { Button } from "../common/Button";
import { useAuth } from "../../features/auth/useAuth";
import { saveRequiredConsent } from "../../features/compliance/consentStorage";
import { useState } from "react";

type SignInConsentButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> & {
  label?: string;
};

export function SignInConsentButton({ label = "Google로 로그인", ...props }: SignInConsentButtonProps) {
  const { signIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  function handleAccept() {
    saveRequiredConsent();
    setIsOpen(false);
    void signIn();
  }

  return (
    <>
      <Button {...props} onClick={() => setIsOpen(true)}>
        <GoogleLogo size={18} weight="regular" />
        {label}
      </Button>
      <ConsentSheet
        actionLabel="동의하고 로그인"
        isOpen={isOpen}
        onAccept={handleAccept}
        onClose={() => setIsOpen(false)}
        showGoogleIcon
      />
    </>
  );
}
