import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, toast, compressImageToDataURL, ICONS } from "./utils.js";
import {
  doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, viewingUid = null, isSelf = true;

const BADGES = {
  tenHikes: { icon: "🥾", label: "Ten Peaks", desc: "Logged 10 hikes" },
  tenCampsites: { icon: "⛺", label: "Camp Regular", desc: "Logged 10 campsites" },
  fiveIslands: { icon: "🏝️", label: "Island Hopper", desc: "Logged 5 islands" }
};

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("profile", me.uid, { premium: profile?.premium });
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
  const badges = (p.badges||[]).map(k=>BADGES[k]).filter(Boolean);

  document.getElementById("profile-root").innerHTML = `
    <div class="profile-cover"></div>
    <div class="profile-head">
      <div class="profile-avatar-wrap">
        ${avatarHTML(p.photoURL, p.displayName, 88)}
        <div id="profile-cta"></div>
      </div>
      <div class="profile-name">${escapeHtml(p.displayName)} ${p.premium ? `<span class="stamp" style="color:var(--color-accent-d);">★ PREMIUM</span>` : ""}</div>
      <div class="profile-username">@${escapeHtml(p.username)}</div>
      <div class="profile-bio">${escapeHtml(p.bio||"")}</div>
      <div class="profile-stats">
        <span><b>${p.postCount||0}</b> logs</span>
        <span><b>${p.hikeCount||0}</b> hikes</span>
        <span><b>${p.campsiteCount||0}</b> campsites</span>
        <span><b>${p.islandCount||0}</b> islands</span>
      </div>
      ${badges.length ? `<div style="display:flex;gap:10px;margin:10px 0;">${badges.map(b=>`
        <span title="${escapeHtml(b.desc)}" style="display:flex;align-items:center;gap:5px;background:var(--color-bg-alt);border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600;">${b.icon} ${escapeHtml(b.label)}</span>
      `).join("")}</div>` : ""}
      ${isSelf ? `<a href="checkin.html" class="btn btn-ghost btn-sm" style="margin-top:6px;">${ICONS.badge} Log a hike / campsite / island</a>` : ""}
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
        updates.photoURL = await compressImageToDataURL(file, { maxDim: 400, maxBytes: 220000 });
      }
      await updateDoc(doc(db,"users",me.uid), updates);
      toast("Profile updated");
      wrap.remove();
      loadProfile();
    }catch(err){
      console.error(err);
      toast(err.message || "Couldn't save changes.");
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
    const inner = p.mediaURL ? `<img src="${escapeHtml(p.mediaURL)}" alt="">` : `<div class="text">${escapeHtml((p.caption||"").slice(0,80))}</div>`;
    return `<a class="cell" href="post.html?id=${d.id}">${inner}</a>`;
  }).join("");
}
