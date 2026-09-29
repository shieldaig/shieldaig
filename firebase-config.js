import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";

// Note: no Firebase Storage here on purpose — Storage requires the paid
// Blaze plan just to touch it at all. Photos are compressed client-side
// and saved directly as Firestore fields instead (see js/utils.js ->
// compressImageToDataURL). Cloud Functions (chatbot + Stripe) also need
// Blaze, but only for functions actually invoked — see STAGES.md.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Second argument must match the region you deploy functions to —
// "us-central1" is the Firebase default if you don't set one explicitly.
export const functions = getFunctions(app, "us-central1");
