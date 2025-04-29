// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";

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
console.log('Initializing Firebase with config:', { ...firebaseConfig, apiKey: '[HIDDEN]' });
const app = initializeApp(firebaseConfig);
console.log('Firebase app initialized');

// Initialize Auth
console.log('Initializing Firebase Auth...');
export const auth = getAuth(app);
console.log('Firebase Auth initialized');

// Initialize Firestore
console.log('Initializing Firestore...');
export const db = getFirestore(app);

// Enable offline persistence if supported
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('Firestore persistence has been enabled.');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all features required for Firestore persistence.');
      } else {
        console.error('Error enabling persistence:', err);
      }
    });
}

console.log('Firestore initialized');

// Initialize Storage
console.log('Initializing Firebase Storage...');
export const storage = getStorage(app);
console.log('Firebase Storage initialized');

// Initialize Analytics (only in production)
let analytics = null;

// Initialize analytics only in production and if supported
if (process.env.NODE_ENV === 'production') {
  console.log('Checking analytics support...');
  isSupported().then(yes => {
    if (yes) {
      console.log('Analytics supported, initializing...');
      analytics = getAnalytics(app);
      console.log('Analytics initialized');
    } else {
      console.log('Analytics not supported in this environment');
    }
  });
}

export default app; 