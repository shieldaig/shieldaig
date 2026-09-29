import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Redirects to login.html if signed out. Resolves with {user, profile}.
export function requireAuth(){
  return new Promise((resolve)=>{
    onAuthStateChanged(auth, async (user)=>{
      if(!user){
        window.location.href = "login.html";
        return;
      }
      let profile = null;
      try{
        const snap = await getDoc(doc(db, "users", user.uid));
        profile = snap.exists() ? snap.data() : null;
      }catch(e){ console.error(e); }
      resolve({user, profile});
    });
  });
}

// If already signed in, bounce away from login/signup pages.
export function redirectIfSignedIn(){
  onAuthStateChanged(auth, (user)=>{
    if(user) window.location.href = "index.html";
  });
}

export function wireLogout(){
  document.addEventListener("click", (e)=>{
    if(e.target.closest("#nav-logout")){
      signOut(auth).then(()=> window.location.href = "login.html");
    }
  });
}
