// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHY-8OscYtL6W86107YQ1xKHlz4QYJgLA",
  authDomain: "spacewars-6be2e.firebaseapp.com",
  projectId: "spacewars-6be2e",
  storageBucket: "spacewars-6be2e.firebasestorage.app",
  messagingSenderId: "391652131150",
  appId: "1:391652131150:web:9c54b876a9bee52cff1e1f",
  measurementId: "G-KX6L9QT3YR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

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
export default app;