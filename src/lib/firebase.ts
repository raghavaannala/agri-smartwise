// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4qlOrr88XUE9vSQ1jYY1ZzAEBjjkjyaU",
  authDomain: "smartagrox-c8990.firebaseapp.com",
  projectId: "smartagrox-c8990",
  storageBucket: "smartagrox-c8990.appspot.com",
  messagingSenderId: "1040204518562",
  appId: "1:1040204518562:web:56e9bd91e9bf4297a0f3fb",
  measurementId: "G-SJYSJJKGKE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only initialize analytics if supported (not in test environments)
export let analytics = null;
// Initialize analytics only in production and if supported
if (process.env.NODE_ENV === 'production') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export default app; 