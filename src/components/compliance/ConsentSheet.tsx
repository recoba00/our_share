import { FileText, GoogleLogo, MapPin, ShieldCheck } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { AnimatedCheckbox } from "../common/AnimatedCheckbox";
import { BottomSheet } from "../common/BottomSheet";
import { Button } from "../common/Button";
import { PolicyDocumentView } from "./PolicyDocumentView";
import type { PolicyDocumentId } from "../../features/compliance/policyDocuments";

type ConsentSheetProps = {
  actionLabel: string;
  blocking?: boolean;
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
  showGoogleIcon?: boolean;
};

export function ConsentSheet({
  actionLabel,
  blocking = false,
  isOpen,
  onAccept,
  onClose,
  showGoogleIcon = false,
}: ConsentSheetProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [activePolicy, setActivePolicy] = useState<PolicyDocumentId | null>(null);

  function resetForm() {
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    setActivePolicy(null);
  }

  function handleClose() {
    resetForm();
    if (!blocking) {
      onClose();
    }
  }

  function handleAccept() {
    resetForm();
    onAccept();
  }

  const canAccept = termsAccepted && privacyAccepted;

  return (
    <>
      <BottomSheet
        footer={
          <Button className="w-full" disabled={!canAccept} onClick={handleAccept} type="button">
            {showGoogleIcon ? <GoogleLogo size={18} weight="regular" /> : null}
            {actionLabel}
          </Button>
        }
        isOpen={isOpen}
        onClose={handleClose}
        title="서비스 이용 동의"
      >
        <div className="grid gap-4">
          <div className="rounded-2xl bg-brand-soft p-4">
            <p className="text-sm font-semibold text-brand">안전하게 시작해요</p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
              우리끼리는 필요한 정보만 사용해요. 위치 권한은 위치 공유를 시작할 때 따로 안내해요.
            </p>
          </div>
          <div className="grid gap-2">
            <ConsentRow
              checked={termsAccepted}
              icon={<FileText size={20} weight="regular" />}
              label="서비스 이용약관에 동의해요"
              onChange={setTermsAccepted}
              onView={() => setActivePolicy("terms")}
            />
            <ConsentRow
              checked={privacyAccepted}
              icon={<ShieldCheck size={20} weight="regular" />}
              label="개인정보 처리방침에 동의해요"
              onChange={setPrivacyAccepted}
              onView={() => setActivePolicy("privacy")}
            />
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-4">
            <MapPin className="mt-0.5 shrink-0 text-brand" size={20} weight="regular" />
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              위치 정보는 위치 공유를 켠 뒤에만 수집하고, 현재 크루 멤버에게만 보여요.
            </p>
          </div>
        </div>
      </BottomSheet>
      <BottomSheet
        isOpen={Boolean(activePolicy)}
        onClose={() => setActivePolicy(null)}
        title={activePolicy ? policyTitle(activePolicy) : "약관"}
      >
        {activePolicy ? <PolicyDocumentView documentId={activePolicy} /> : null}
      </BottomSheet>
    </>
  );
}

function ConsentRow({
  checked,
  icon,
  label,
  onChange,
  onView,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
  onView: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[var(--color-surface-muted)] p-3">
      <AnimatedCheckbox
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="shrink-0 text-brand">{icon}</span>
      <span className="min-w-0 flex-1 text-sm font-semibold">{label}</span>
      <button
        className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)] underline underline-offset-2"
        onClick={onView}
        type="button"
      >
        보기
      </button>
    </div>
  );
}

function policyTitle(documentId: PolicyDocumentId) {
  if (documentId === "terms") {
    return "서비스 이용약관";
  }

  if (documentId === "privacy") {
    return "개인정보 처리방침";
  }

  if (documentId === "location") {
    return "위치정보 이용 안내";
  }

  return "공지사항";
}
