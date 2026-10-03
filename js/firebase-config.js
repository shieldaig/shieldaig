import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// No Firebase Storage (needs Blaze just to touch it) and no Firebase
// Functions SDK either — Cloud Functions here are deployed by hand in the
// Google Cloud Console (no CLI) and called with a plain fetch() instead.
// See js/functions-config.js and STAGES.md.

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
