import { db, storage } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, toast, fileToStoragePath } from "./utils.js";
import {
  doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

let me = null, myProfile = null, viewingUid = null, isSelf = true;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("profile", me.uid);
  wireLogout();

  const params = new URLSearchParams(location.search);
  viewingUid = params.get("uid") || me.uid;
  isSelf = viewingUid === me.uid;

  await loadProfile();
  await loadPosts();
}

async function loadProfile(){
  const snap = await getDoc(doc(db,"users",viewingUid));
  if(!snap.exists()){
    document.getElementById("profile-root").innerHTML = `<div class="empty-state"><h3>Paddler not found</h3></div>`;
    return;
  }
  const p = snap.data();
  document.getElementById("profile-root").innerHTML = `
    <div class="profile-cover"></div>
    <div class="profile-head">
      <div class="profile-avatar-wrap">
        ${avatarHTML(p.photoURL, p.displayName, 88)}
        <div id="profile-cta"></div>
      </div>
      <div class="profile-name">${escapeHtml(p.displayName)}</div>
      <div class="profile-username">@${escapeHtml(p.username)}</div>
      <div class="profile-bio">${escapeHtml(p.bio||"")}</div>
      <div class="profile-stats"><span><b>${p.postCount||0}</b> logs</span></div>
    </div>
    <div class="profile-tabs"><div class="profile-tab active">Log entries</div></div>
    <div class="grid-posts" id="profile-grid"></div>
  `;

  const cta = document.getElementById("profile-cta");
  if(isSelf){
    cta.innerHTML = `<button class="btn btn-ghost btn-sm" id="edit-profile-btn">Edit profile</button>`;
    document.getElementById("edit-profile-btn").addEventListener("click", ()=> openEditModal(p));
  }else{
    cta.innerHTML = `<a class="btn btn-primary btn-sm" href="messages.html?uid=${viewingUid}">Message</a>`;
  }
}

function openEditModal(p){
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;background:rgba(15,49,48,0.5);display:flex;align-items:center;justify-content:center;z-index:60;padding:20px;";
  wrap.innerHTML = `
    <div style="background:var(--color-surface);border-radius:var(--radius-l);padding:24px;max-width:380px;width:100%;box-shadow:var(--shadow-pop);">
      <h2 style="font-family:var(--font-display);margin:0 0 16px;">Edit profile</h2>
      <div class="field"><label>Name</label><input id="ed-name" value="${escapeHtml(p.displayName)}"></div>
      <div class="field"><label>Bio</label><textarea id="ed-bio" rows="3">${escapeHtml(p.bio||"")}</textarea></div>
      <div class="field"><label>Photo</label><input type="file" id="ed-photo" accept="image/*"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
        <button class="btn btn-ghost" id="ed-cancel">Cancel</button>
        <button class="btn btn-primary" id="ed-save">Save</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelector("#ed-cancel").addEventListener("click", ()=> wrap.remove());
  wrap.querySelector("#ed-save").addEventListener("click", async ()=>{
    const saveBtn = wrap.querySelector("#ed-save");
    saveBtn.disabled = true; saveBtn.textContent = "Saving…";
    try{
      const updates = {
        displayName: wrap.querySelector("#ed-name").value.trim() || p.displayName,
        bio: wrap.querySelector("#ed-bio").value.trim()
      };
      const file = wrap.querySelector("#ed-photo").files[0];
      if(file){
        const path = fileToStoragePath(me.uid, file, "avatars");
        const sref = ref(storage, path);
        await uploadBytes(sref, file);
        updates.photoURL = await getDownloadURL(sref);
      }
      await updateDoc(doc(db,"users",me.uid), updates);
      toast("Profile updated");
      wrap.remove();
      loadProfile();
    }catch(err){
      console.error(err);
      toast("Couldn't save changes.");
      saveBtn.disabled = false; saveBtn.textContent = "Save";
    }
  });
}

async function loadPosts(){
  const grid = document.getElementById("profile-grid");
  const q = query(collection(db,"posts"), where("uid","==",viewingUid), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  if(snap.empty){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No logs yet</h3><p>${isSelf ? "Post your first paddle." : "This paddler hasn't logged anything yet."}</p></div>`;
    return;
  }
  grid.innerHTML = snap.docs.map(d=>{
    const p = d.data();
    let inner;
    if(p.mediaType==="video") inner = `<video src="${escapeHtml(p.mediaURL)}" muted preload="metadata"></video>`;
    else if(p.mediaType==="image") inner = `<img src="${escapeHtml(p.mediaURL)}" alt="">`;
    else inner = `<div class="text">${escapeHtml((p.caption||"").slice(0,80))}</div>`;
    return `<a class="cell" href="post.html?id=${d.id}">${inner}</a>`;
  }).join("");
}
