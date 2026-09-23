import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

const projectId = "our-share-6baf5";
const databaseURL =
  "https://our-share-6baf5-default-rtdb.asia-southeast1.firebasedatabase.app";
const validRoles = new Set(["OWNER", "VICE_OWNER", "PARENT", "MEMBER", "CHILD"]);

const app = initializeApp({
  credential: applicationDefault(),
  databaseURL,
  projectId,
});
const firestore = getFirestore(app);
const [familySnapshot, memberSnapshot] = await Promise.all([
  firestore.collection("families").get(),
  firestore.collection("familyMembers").get(),
]);
const familyIds = new Set(familySnapshot.docs.map((familyDocument) => familyDocument.id));
const updates = {};
let skippedCount = 0;
const updatedAt = Date.now();

for (const memberDocument of memberSnapshot.docs) {
  const { familyId, role, userId } = memberDocument.data();

  if (
    typeof familyId !== "string" ||
    !familyIds.has(familyId) ||
    typeof userId !== "string" ||
    typeof role !== "string" ||
    !validRoles.has(role)
  ) {
    skippedCount += 1;
    continue;
  }

  updates[`familyMembers/${familyId}/${userId}`] = {
    role,
    updatedAt,
    userId,
  };
}

if (Object.keys(updates).length > 0) {
  await getDatabase(app).ref().update(updates);
}

console.log(
  `Backfilled ${Object.keys(updates).length} RTDB membership mirrors; skipped ${skippedCount}.`
);

await deleteApp(app);
