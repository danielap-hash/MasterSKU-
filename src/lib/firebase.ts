import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const firebaseConfig = {
  projectId: "waking-inkwell-wdw25",
  appId: "1:794432509226:web:e495d712c77ce9c275fa53",
  apiKey: "AIzaSyBr3x-0evl_GptjfWjxannXOhvB5vNfFK8",
  authDomain: "waking-inkwell-wdw25.firebaseapp.com",
  storageBucket: "waking-inkwell-wdw25.firebasestorage.app",
  messagingSenderId: "794432509226"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId and enable offline persistence safely
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-remixmaestroskuy-6b9fe03f-dff4-48ba-82ab-900852413f96");

const auth = getAuth(app);

// Authentication helper to ensure we always have an active session
export function ensureAuthenticated(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => {
            unsubscribe();
            resolve(cred.user);
          })
          .catch((err) => {
            console.warn("Failed anonymous sign-in gracefully. Continuing without auth context.", err);
            unsubscribe();
            resolve(null);
          });
      }
    });
  });
}

export { app, db, auth };
