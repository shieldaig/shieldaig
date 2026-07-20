import { auth, db, storage } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, timeAgo, toast, ICONS, fileToStoragePath } from "./utils.js";
import {
  collection, addDoc, doc, getDoc, getDocs, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, runTransaction, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

let me = null;
let myProfile = null;
let pendingFile = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("feed", me.uid);
  wireLogout();
  wireComposer();
  listenFeed();
}

function wireComposer(){
  const textEl = document.getElementById("composer-text");
  const fileInput = document.getElementById("composer-file");
  const preview = document.getElementById("composer-preview");
  const postBtn = document.getElementById("composer-post");

  document.getElementById("composer-img-btn").addEventListener("click", ()=>{
    fileInput.accept = "image/*"; fileInput.click();
  });
  document.getElementById("composer-vid-btn").addEventListener("click", ()=>{
    fileInput.accept = "video/*"; fileInput.click();
  });
  fileInput.addEventListener("change", ()=>{
    const f = fileInput.files[0];
    if(!f) return;
    pendingFile = f;
    const url = URL.createObjectURL(f);
    const isVideo = f.type.startsWith("video");
    preview.innerHTML = `
      ${isVideo ? `<video src="${url}" controls></video>` : `<img src="${url}" alt="">`}
      <button class="rm" type="button" id="composer-rm">✕</button>`;
    preview.classList.remove("hidden");
  });
  preview.addEventListener("click", (e)=>{
    if(e.target.id === "composer-rm"){
      pendingFile = null;
      fileInput.value = "";
      preview.innerHTML = "";
      preview.classList.add("hidden");
    }
  });

  postBtn.addEventListener("click", async ()=>{
    const text = textEl.value.trim();
    if(!text && !pendingFile){ toast("Write something or add a photo/video first."); return; }
    postBtn.disabled = true; postBtn.textContent = "Posting…";
    try{
      let mediaURL = "", mediaType = "";
      if(pendingFile){
        mediaType = pendingFile.type.startsWith("video") ? "video" : "image";
        const path = fileToStoragePath(me.uid, pendingFile, "posts");
        const sref = ref(storage, path);
        await uploadBytes(sref, pendingFile);
        mediaURL = await getDownloadURL(sref);
      }
      await addDoc(collection(db,"posts"), {
        uid: me.uid,
        displayName: myProfile?.displayName || me.displayName || "Paddler",
        username: myProfile?.username || "",
        userPhotoURL: myProfile?.photoURL || "",
        caption: text,
        mediaURL, mediaType,
        likeCount: 0,
        commentCount: 0,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db,"users",me.uid), { postCount: increment(1) }).catch(()=>{});
      textEl.value = "";
      pendingFile = null;
      fileInput.value = "";
      preview.innerHTML = "";
      preview.classList.add("hidden");
      toast("Logged 🛶");
    }catch(err){
      console.error(err);
      toast("Couldn't post — try again.");
    }
    postBtn.disabled = false; postBtn.textContent = "Log it";
  });
}

function listenFeed(){
  const feedEl = document.getElementById("feed");
  const q = query(collection(db,"posts"), orderBy("createdAt","desc"), limit(50));
  onSnapshot(q, async (snap)=>{
    if(snap.empty){
      feedEl.innerHTML = `<div class="empty-state"><h3>The loch is quiet</h3><p>Be the first to log a paddle today.</p></div>`;
      return;
    }
    const cards = await Promise.all(snap.docs.map(d=>renderPost(d.id, d.data())));
    feedEl.innerHTML = cards.join("");
    wirePostActions(feedEl);
  });
}

async function renderPost(id, p){
  let liked = false;
  try{
    const likeSnap = await getDoc(doc(db,"posts",id,"likes",me.uid));
    liked = likeSnap.exists();
  }catch(e){}
  const dateStamp = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString(undefined,{day:"2-digit",month:"short"}).toUpperCase() : "";
  const mediaHTML = p.mediaURL
    ? `<div class="post-media">${p.mediaType==="video" ? `<video src="${escapeHtml(p.mediaURL)}" controls></video>` : `<img src="${escapeHtml(p.mediaURL)}" alt="">`}</div>`
    : "";
  const isMine = p.uid === me.uid;
  return `
    <article class="post" data-id="${id}" data-uid="${p.uid}">
      ${isMine ? `<button class="icon-btn post-del" title="Delete" data-action="delete">${ICONS.trash}</button>` : ""}
      <div class="post-head">
        <a href="profile.html?uid=${p.uid}">${avatarHTML(p.userPhotoURL, p.displayName, 40)}</a>
        <div class="post-head-info">
          <div class="post-name-row">
            <a class="post-name" href="profile.html?uid=${p.uid}">${escapeHtml(p.displayName)}</a>
            <span class="post-user">@${escapeHtml(p.username)}</span>
            <span class="post-time">· ${timeAgo(p.createdAt)}</span>
            ${dateStamp ? `<span class="post-logno stamp">${dateStamp}</span>` : ""}
          </div>
        </div>
      </div>
      <div class="post-body">
        ${p.caption ? `<div class="post-caption">${escapeHtml(p.caption)}</div>` : ""}
        ${mediaHTML}
      </div>
      <div class="post-actions">
        <button class="action-btn ${liked?"liked":""}" data-action="like">${liked?ICONS.heartFill:ICONS.heart}<span>${p.likeCount||0}</span></button>
        <a class="action-btn" href="post.html?id=${id}">${ICONS.comment}<span>${p.commentCount||0}</span></a>
      </div>
    </article>`;
}

function wirePostActions(feedEl){
  feedEl.querySelectorAll(".post").forEach(card=>{
    const id = card.dataset.id;
    const uid = card.dataset.uid;
    card.querySelector('[data-action="like"]').addEventListener("click", async (e)=>{
      e.preventDefault();
      await toggleLike(id, card.querySelector('[data-action="like"]'));
    });
    const delBtn = card.querySelector('[data-action="delete"]');
    if(delBtn){
      delBtn.addEventListener("click", async ()=>{
        if(!confirm("Delete this log entry?")) return;
        try{
          await deleteDoc(doc(db,"posts",id));
          toast("Deleted.");
        }catch(err){ console.error(err); toast("Couldn't delete."); }
      });
    }
  });
}

async function toggleLike(postId, btn){
  const likeRef = doc(db,"posts",postId,"likes",me.uid);
  const postRef = doc(db,"posts",postId);
  try{
    await runTransaction(db, async (tx)=>{
      const likeSnap = await tx.get(likeRef);
      const postSnap = await tx.get(postRef);
      if(!postSnap.exists()) return;
      const current = postSnap.data().likeCount || 0;
      if(likeSnap.exists()){
        tx.delete(likeRef);
        tx.update(postRef, { likeCount: Math.max(0,current-1) });
      }else{
        tx.set(likeRef, { createdAt: serverTimestamp() });
        tx.update(postRef, { likeCount: current+1 });
      }
    });
    const nowLiked = btn.classList.toggle("liked");
    const countEl = btn.querySelector("span");
    const n = parseInt(countEl.textContent||"0",10);
    countEl.textContent = nowLiked ? n+1 : Math.max(0,n-1);
    btn.innerHTML = (nowLiked ? ICONS.heartFill : ICONS.heart) + `<span>${countEl.textContent}</span>`;
  }catch(err){
    console.error(err);
    toast("Couldn't update like.");
  }
}
