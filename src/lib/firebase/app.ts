import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCY9-04RVkdOzSZRYJDJbAZBArmVIERdt0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "our-share-6baf5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "our-share-6baf5",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://our-share-6baf5-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "our-share-6baf5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "297070610466",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:297070610466:web:d0be0b8666ee690431a27b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CS4JJSEPXB",
};

export const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const realtimeDb = getDatabase(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
