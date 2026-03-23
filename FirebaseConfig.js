// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyArMWsol-AraXzTy19Qvr5spOli6_pgX48",
  authDomain: "spacewars-ba9bc.firebaseapp.com",
  projectId: "spacewars-ba9bc",
  storageBucket: "spacewars-ba9bc.firebasestorage.app",
  messagingSenderId: "855131357608",
  appId: "1:855131357608:web:e72155acbfa6fc6c371d9d",
  measurementId: "G-SSBQXP0PS2"
};

const missingConfig = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
].filter((key) => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase env vars: ${missingConfig.map((key) => `EXPO_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (char) => `_${char}`).toUpperCase()}`).join(', ')}`
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Auth with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If already initialized, just get the instance
  auth = getAuth(app);
}

export { auth };
export { db };
export default app;
