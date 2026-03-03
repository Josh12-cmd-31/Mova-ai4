import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWz2qT5B1gebQUH6PWF8GCixdvcBBFQOY",
  authDomain: "mova-bd603.firebaseapp.com",
  projectId: "mova-bd603",
  storageBucket: "mova-bd603.firebasestorage.app",
  messagingSenderId: "935093174447",
  appId: "1:935093174447:web:f3323598aa30efc32e145a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
};
export type { User };
