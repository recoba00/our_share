import { deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const projectId = process.env.GCLOUD_PROJECT ?? "our-share-6baf5";
const databaseId =
  process.env.FIREBASE_DATABASE_ID ?? `${projectId}-default-rtdb`;
const databaseEmulatorHost =
  process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
const app = initializeApp({
  projectId,
  databaseURL: `http://${databaseEmulatorHost}?ns=${databaseId}`,
});
const firestore = getFirestore(app);
const realtimeDatabase = getDatabase(app);

async function waitForMirror(path: string, expectedRole?: string) {
  const timeoutAt = Date.now() + 10_000;

  while (Date.now() < timeoutAt) {
    const snapshot = await realtimeDatabase.ref(path).get();
    const value = snapshot.val();

    if (
      expectedRole === undefined
        ? value === null
        : value?.role === expectedRole
    ) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for RTDB mirror: ${path}`);
}

describe("family member mirror triggers", () => {
  const familyId = `emulator-group-${Date.now()}`;
  const userId = `emulator-user-${Date.now()}`;
  const memberPath = `familyMembers/${familyId}/${userId}`;
  const memberRef = firestore
    .collection("familyMembers")
    .doc(`${familyId}_${userId}`);

  beforeAll(async () => {
    if (getApps().length === 0) {
      throw new Error("Firebase Admin app was not initialized");
    }
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it("creates, updates, and deletes the RTDB mirror", async () => {
    await memberRef.set({ familyId, userId, role: "MEMBER" });
    expect((await waitForMirror(memberPath, "MEMBER")).userId).toBe(userId);

    await memberRef.update({ role: "PARENT" });
    expect((await waitForMirror(memberPath, "PARENT")).role).toBe("PARENT");

    await memberRef.delete();
    expect(await waitForMirror(memberPath)).toBeNull();
  });
});
