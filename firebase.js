import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// REPLACE THIS OBJECT WITH THE CONFIG FROM THE FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyC1nXOkuuNsw7FGRlXPo1xO4WkU5k01kwY",
    authDomain: "baseball-metrics-9dc0a.firebaseapp.com",
    projectId: "baseball-metrics-9dc0a",
    storageBucket: "baseball-metrics-9dc0a.firebasestorage.app",
    messagingSenderId: "513500615400",
    appId: "1:513500615400:web:8ff4c2dff5ede5346f2f5d",
    measurementId: "G-SP81BGTJ6J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { firebaseConfig };
