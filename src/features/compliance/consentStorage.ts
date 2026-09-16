import { POLICY_VERSION } from "./policyDocuments";

const requiredConsentStorageKey = "our-share:required-consent";
const locationConsentStoragePrefix = "our-share:location-consent:";

export type RequiredConsentRecord = {
  privacy: true;
  terms: true;
  version: string;
  consentedAt: string;
};

export function hasRequiredConsent() {
  return getStoredRequiredConsent()?.version === POLICY_VERSION;
}

export function getStoredRequiredConsent(): RequiredConsentRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(requiredConsentStorageKey);
    if (!rawValue) {
      return null;
    }

    const value = JSON.parse(rawValue) as Partial<RequiredConsentRecord>;
    if (value.privacy !== true || value.terms !== true || !value.version || !value.consentedAt) {
      return null;
    }

    return {
      consentedAt: value.consentedAt,
      privacy: true,
      terms: true,
      version: value.version,
    };
  } catch {
    return null;
  }
}

export function saveRequiredConsent() {
  const record: RequiredConsentRecord = {
    consentedAt: new Date().toISOString(),
    privacy: true,
    terms: true,
    version: POLICY_VERSION,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(requiredConsentStorageKey, JSON.stringify(record));
  }

  return record;
}

export function hasLocationShareConsent(userId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(`${locationConsentStoragePrefix}${userId}`) === POLICY_VERSION;
}

export function saveLocationShareConsent(userId: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`${locationConsentStoragePrefix}${userId}`, POLICY_VERSION);
  }
}
