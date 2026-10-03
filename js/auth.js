import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc, setDoc, query, collection, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { redirectIfSignedIn } from "./session.js";

redirectIfSignedIn();

function showError(msg){
  const el = document.getElementById("form-error");
  if(!el) return;
  el.textContent = msg;
  el.classList.add("show");
}
function clearError(){
  const el = document.getElementById("form-error");
  if(el){ el.textContent = ""; el.classList.remove("show"); }
}
function friendlyError(err){
  const map = {
    "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Password needs to be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Wrong password. Try again.",
    "auth/invalid-credential": "Email or password is incorrect."
  };
  return map[err.code] || err.message;
}

const signupForm = document.getElementById("signup-form");
if(signupForm){
  signupForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearError();
    const btn = signupForm.querySelector("button[type=submit]");
    const displayName = document.getElementById("su-name").value.trim();
    let username = document.getElementById("su-username").value.trim().toLowerCase();
    username = username.replace(/[^a-z0-9_]/g,"");
    const email = document.getElementById("su-email").value.trim();
    const password = document.getElementById("su-password").value;

    if(!displayName || !username || !email || password.length < 6){
      showError("Fill in every field — password needs 6+ characters.");
      return;
    }

    btn.disabled = true; btn.textContent = "Creating account…";
    try{
      const q = query(collection(db,"users"), where("username","==",username));
      const existing = await getDocs(q);
      if(!existing.empty){
        showError("That username is taken. Try another.");
        btn.disabled = false; btn.textContent = "Create account";
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        displayName,
        username,
        bio: "New to the loch. 🛶",
        photoURL: "",
        postCount: 0,
        premium: false,
        trialUsed: false,
        boostCredits: 0,
        hikeCount: 0,
        campsiteCount: 0,
        islandCount: 0,
        badges: [],
        createdAt: serverTimestamp()
      });
      window.location.href = "index.html";
    }catch(err){
      showError(friendlyError(err));
      btn.disabled = false; btn.textContent = "Create account";
    }
  });
}

const loginForm = document.getElementById("login-form");
if(loginForm){
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    clearError();
    const btn = loginForm.querySelector("button[type=submit]");
    const email = document.getElementById("li-email").value.trim();
    const password = document.getElementById("li-password").value;
    if(!email || !password){ showError("Enter your email and password."); return; }

    btn.disabled = true; btn.textContent = "Logging in…";
    try{
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "index.html";
    }catch(err){
      showError(friendlyError(err));
      btn.disabled = false; btn.textContent = "Log in";
    }
  });
}
