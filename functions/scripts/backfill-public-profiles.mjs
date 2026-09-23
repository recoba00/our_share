import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "our-share-6baf5";
const app = initializeApp({ credential: applicationDefault(), projectId });
const firestore = getFirestore(app);

const usersSnapshot = await firestore.collection("users").get();
const chunks = [];

for (let index = 0; index < usersSnapshot.docs.length; index += 400) {
  chunks.push(usersSnapshot.docs.slice(index, index + 400));
}

for (const userDocuments of chunks) {
  const batch = firestore.batch();

  userDocuments.forEach((userDocument) => {
    const user = userDocument.data();
    const timestamp = FieldValue.serverTimestamp();

    batch.set(
      firestore.collection("publicProfiles").doc(userDocument.id),
      {
        createdAt: user.createdAt ?? timestamp,
        displayName: typeof user.displayName === "string" ? user.displayName : null,
        id: userDocument.id,
        photoURL: typeof user.photoURL === "string" ? user.photoURL : null,
        updatedAt: user.updatedAt ?? timestamp,
      },
      { merge: true }
    );
  });

  await batch.commit();
}

console.log(`Backfilled ${usersSnapshot.size} public profiles.`);
await deleteApp(app);
