// ============================================================
// FIREBASE CONFIG
// Replace the values below with the ones from your own Firebase
// project (Project settings → General → Your apps → SDK setup).
// See README.md for the full step-by-step setup.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBYSc-5T0IsFFDFxT1r4ntFmZAdAF-hqWM",
    authDomain: "shieldaig-1.firebaseapp.com",
    projectId: "shieldaig-1",
    storageBucket: "shieldaig-1.firebasestorage.app",
    messagingSenderId: "448954018164",
    appId: "1:448954018164:web:061149bed22f615c79e421",
    measurementId: "G-LB3FTB87FE"  
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
