import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeSz_N-gD8GfQJJ-ZqtuEmnC8TbpYPc44",
  authDomain: "mova-a6ec6.firebaseapp.com",
  projectId: "mova-a6ec6",
  storageBucket: "mova-a6ec6.firebasestorage.app",
  messagingSenderId: "173698947730",
  appId: "1:173698947730:web:883fff3df0d09e3311e44b",
  measurementId: "G-BSX7DEZ6JJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };
