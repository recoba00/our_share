import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { logger } from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import { buildMembershipMirror, type FamilyMemberRecord } from "./membershipMirror";

initializeApp();

const familyMemberTrigger = {
  document: "familyMembers/{memberId}",
  region: "asia-northeast3" as const,
};

function toRecord(data: Record<string, unknown> | undefined): FamilyMemberRecord {
  return data ?? {};
}

async function writeMembershipMirror(data: Record<string, unknown> | undefined) {
  const mutation = buildMembershipMirror(toRecord(data));

  if (!mutation) {
    logger.warn("Skipped invalid family member mirror record", { data });
    return;
  }

  await getDatabase().ref(mutation.path).set(mutation.data);
}

async function removeMembershipMirror(data: Record<string, unknown> | undefined) {
  const mutation = buildMembershipMirror(toRecord(data));

  if (!mutation) {
    logger.warn("Skipped invalid family member mirror delete", { data });
    return;
  }

  await getDatabase().ref(mutation.path).remove();
}

export const syncFamilyMemberCreated = onDocumentCreated(
  familyMemberTrigger,
  async (event) => writeMembershipMirror(event.data?.data())
);

export const syncFamilyMemberUpdated = onDocumentUpdated(
  familyMemberTrigger,
  async (event) => writeMembershipMirror(event.data?.after.data())
);

export const syncFamilyMemberDeleted = onDocumentDeleted(
  familyMemberTrigger,
  async (event) => removeMembershipMirror(event.data?.data())
);
