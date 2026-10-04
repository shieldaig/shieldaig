import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, timeAgo, toast, ICONS } from "./utils.js";
import {
  doc, getDoc, deleteDoc, collection, addDoc, onSnapshot, query, orderBy,
  serverTimestamp, runTransaction, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, postId = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("feed", me.uid, { premium: profile?.premium });
  wireLogout();

  const params = new URLSearchParams(location.search);
  postId = params.get("id");
  if(!postId){ document.getElementById("post-detail").innerHTML = notFound(); return; }

  const snap = await getDoc(doc(db,"posts",postId));
  if(!snap.exists()){ document.getElementById("post-detail").innerHTML = notFound(); return; }
  await renderPost(snap.data());
  listenComments();
  wireCommentForm();
}

function notFound(){
  return `<div class="empty-state"><h3>Log entry not found</h3><p>It may have been deleted.</p></div>`;
}

async function renderPost(p){
  let liked = false;
  try{ liked = (await getDoc(doc(db,"posts",postId,"likes",me.uid))).exists(); }catch(e){}
  const mediaHTML = p.mediaURL ? `<div class="post-media"><img src="${escapeHtml(p.mediaURL)}" alt=""></div>` : "";
  const isMine = p.uid === me.uid;
  document.getElementById("post-detail").innerHTML = `
    <article class="post" style="border-bottom:none;">
      ${isMine ? `<button class="icon-btn post-del" id="del-post" title="Delete">${ICONS.trash}</button>` : ""}
      <div class="post-head">
        <a href="profile.html?uid=${p.uid}">${avatarHTML(p.userPhotoURL, p.displayName, 40)}</a>
        <div class="post-head-info">
          <div class="post-name-row">
            <a class="post-name" href="profile.html?uid=${p.uid}">${escapeHtml(p.displayName)}</a>
            <span class="post-user">@${escapeHtml(p.username)}</span>
            <span class="post-time">· ${timeAgo(p.createdAt)}</span>
          </div>
        </div>
      </div>
      <div class="post-body">
        ${p.caption ? `<div class="post-caption">${escapeHtml(p.caption)}</div>` : ""}
        ${mediaHTML}
      </div>
      <div class="post-actions">
        <button class="action-btn ${liked?"liked":""}" id="like-btn">${liked?ICONS.heartFill:ICONS.heart}<span id="like-count">${p.likeCount||0}</span></button>
        <div class="action-btn" style="pointer-events:none;">${ICONS.comment}<span id="comment-count">${p.commentCount||0}</span></div>
      </div>
    </article>
    <div class="comments" id="comments-list" style="margin-left:18px;padding-left:0;border-top:none;"></div>
  `;

  document.getElementById("like-btn").addEventListener("click", async ()=> toggleLike());
  const delBtn = document.getElementById("del-post");
  if(delBtn){
    delBtn.addEventListener("click", async ()=>{
      if(!confirm("Delete this log entry?")) return;
      await deleteDoc(doc(db,"posts",postId));
      toast("Deleted.");
      window.location.href = "index.html";
    });
  }
}

async function toggleLike(){
  const likeRef = doc(db,"posts",postId,"likes",me.uid);
  const postRef = doc(db,"posts",postId);
  const btn = document.getElementById("like-btn");
  const countEl = document.getElementById("like-count");
  try{
    let nowLiked = false;
    await runTransaction(db, async (tx)=>{
      const likeSnap = await tx.get(likeRef);
      const postSnap = await tx.get(postRef);
      const current = postSnap.data().likeCount || 0;
      if(likeSnap.exists()){ tx.delete(likeRef); tx.update(postRef,{likeCount:Math.max(0,current-1)}); nowLiked=false; }
      else{ tx.set(likeRef,{createdAt:serverTimestamp()}); tx.update(postRef,{likeCount:current+1}); nowLiked=true; }
    });
    const n = parseInt(countEl.textContent||"0",10);
    countEl.textContent = nowLiked ? n+1 : Math.max(0,n-1);
    btn.classList.toggle("liked", nowLiked);
    btn.innerHTML = (nowLiked?ICONS.heartFill:ICONS.heart) + `<span id="like-count">${countEl.textContent}</span>`;
  }catch(err){ console.error(err); toast("Couldn't update like."); }
}

function listenComments(){
  const q = query(collection(db,"posts",postId,"comments"), orderBy("createdAt","asc"));
  onSnapshot(q, (snap)=>{
    const list = document.getElementById("comments-list");
    if(snap.empty){
      list.innerHTML = `<p style="color:var(--color-ink-soft);font-size:13.5px;padding:10px 0;">No comments yet — say something first.</p>`;
      return;
    }
    list.innerHTML = snap.docs.map(d=>{
      const c = d.data();
      return `<div class="comment">${avatarHTML(c.userPhotoURL, c.displayName, 32)}
        <div class="comment-bubble"><span class="comment-name">${escapeHtml(c.displayName)}</span>${escapeHtml(c.text)}</div></div>`;
    }).join("");
  });
}

function wireCommentForm(){
  const form = document.getElementById("comment-form");
  const input = document.getElementById("comment-input");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    input.disabled = true;
    try{
      await addDoc(collection(db,"posts",postId,"comments"), {
        uid: me.uid,
        displayName: myProfile?.displayName || me.displayName || "Paddler",
        userPhotoURL: myProfile?.photoURL || "",
        text, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db,"posts",postId), { commentCount: increment(1) });
      const el = document.getElementById("comment-count");
      el.textContent = (parseInt(el.textContent||"0",10)+1);
      input.value = "";
    }catch(err){ console.error(err); toast("Couldn't add comment."); }
    input.disabled = false; input.focus();
  });
}
