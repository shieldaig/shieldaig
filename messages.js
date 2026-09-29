import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, timeAgo, toast, ICONS } from "./utils.js";
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot, query,
  where, orderBy, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, activeChatId = null, activeOther = null, unsubMsgs = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("messages", me.uid, { premium: profile?.premium });
  wireLogout();
  wireNewMessage();
  listenChatList();

  const params = new URLSearchParams(location.search);
  const uid = params.get("uid");
  if(uid && uid !== me.uid) openChatWith(uid);
}

function chatIdFor(a,b){ return [a,b].sort().join("_"); }

function listenChatList(){
  const q = query(collection(db,"chats"), where("participants","array-contains", me.uid), orderBy("lastMessageAt","desc"));
  onSnapshot(q, (snap)=>{
    const list = document.getElementById("chat-list");
    if(snap.empty){
      list.innerHTML = `<div class="empty-state"><h3>No messages yet</h3><p>Find a paddler's profile and hit Message.</p></div>`;
      return;
    }
    list.innerHTML = snap.docs.map(d=>{
      const c = d.data();
      const otherUid = c.participants.find(p=>p!==me.uid);
      const other = c.participantInfo?.[otherUid] || {};
      return `
        <div class="chat-list-item ${d.id===activeChatId?"active":""}" data-id="${d.id}" data-uid="${otherUid}">
          ${avatarHTML(other.photoURL, other.displayName, 40)}
          <div class="info">
            <div class="n">${escapeHtml(other.displayName||"Paddler")}</div>
            <div class="p">${escapeHtml(c.lastMessage||"")}</div>
          </div>
        </div>`;
    }).join("");
    list.querySelectorAll(".chat-list-item").forEach(el=>{
      el.addEventListener("click", ()=> openChatWith(el.dataset.uid));
    });
  });
}

async function openChatWith(otherUid){
  activeChatId = chatIdFor(me.uid, otherUid);
  const otherSnap = await getDoc(doc(db,"users",otherUid));
  if(!otherSnap.exists()) return;
  activeOther = otherSnap.data();

  document.querySelectorAll(".chat-list-item").forEach(el=>{
    el.classList.toggle("active", el.dataset.id===activeChatId);
  });

  const pane = document.getElementById("chat-pane");
  pane.classList.remove("hidden");
  document.getElementById("chat-empty")?.classList.add("hidden");
  document.getElementById("chat-head-info").innerHTML = `
    ${avatarHTML(activeOther.photoURL, activeOther.displayName, 32)}
    <div><div style="font-weight:700;font-size:14px;">${escapeHtml(activeOther.displayName)}</div>
    <div style="font-size:12px;color:var(--color-ink-soft);">@${escapeHtml(activeOther.username)}</div></div>
  `;

  const chatRef = doc(db,"chats",activeChatId);
  const chatSnap = await getDoc(chatRef);
  if(!chatSnap.exists()){
    await setDoc(chatRef, {
      participants: [me.uid, otherUid],
      participantInfo: {
        [me.uid]: { displayName: myProfile?.displayName||me.displayName||"Paddler", username: myProfile?.username||"", photoURL: myProfile?.photoURL||"" },
        [otherUid]: { displayName: activeOther.displayName, username: activeOther.username, photoURL: activeOther.photoURL||"" }
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp()
    });
  }

  if(unsubMsgs) unsubMsgs();
  const q = query(collection(db,"chats",activeChatId,"messages"), orderBy("createdAt","asc"));
  unsubMsgs = onSnapshot(q, (snap)=>{
    const box = document.getElementById("chat-msgs");
    box.innerHTML = snap.docs.map(d=>{
      const m = d.data();
      const mine = m.senderId === me.uid;
      return `<div class="bubble ${mine?"mine":"theirs"}">${escapeHtml(m.text)}<span class="t">${timeAgo(m.createdAt)}</span></div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  });

  history.replaceState(null,"",`messages.html?uid=${otherUid}`);
}

function wireChatForm(){
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text || !activeChatId) return;
    input.value = "";
    try{
      await addDoc(collection(db,"chats",activeChatId,"messages"), {
        senderId: me.uid, text, createdAt: serverTimestamp()
      });
      await updateDoc(doc(db,"chats",activeChatId), {
        lastMessage: text, lastMessageAt: serverTimestamp()
      });
    }catch(err){ console.error(err); toast("Message didn't send."); }
  });
}
wireChatForm();

function wireNewMessage(){
  document.getElementById("new-msg-btn").addEventListener("click", async ()=>{
    const username = prompt("Enter a paddler's username to message:");
    if(!username) return;
    const clean = username.trim().replace("@","").toLowerCase();
    const q = query(collection(db,"users"), where("username","==",clean));
    const snap = await getDocs(q);
    if(snap.empty){ toast("No paddler found with that username."); return; }
    const found = snap.docs[0];
    if(found.id === me.uid){ toast("That's you!"); return; }
    openChatWith(found.id);
  });
}
