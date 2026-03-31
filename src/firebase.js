import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLvvxjGncsBDFR1cE-WO2kBtfuNY54OFk",
  authDomain: "training-app-ecce6.firebaseapp.com",
  projectId: "training-app-ecce6",
  storageBucket: "training-app-ecce6.firebasestorage.app",
  messagingSenderId: "533673641624",
  appId: "1:533673641624:web:ba78d9784e7f4aef9db2ed"
};

const app = initializeApp(firebaseConfig);

// persistentLocalCache habilita offline via IndexedDB (built-in en Firebase v10+)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
