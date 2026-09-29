import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, toast, escapeHtml } from "./utils.js";
import {
  collection, addDoc, doc, getDocs, query, where, orderBy,
  serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null;

const TYPE_META = {
  hike: { field: "hikeCount", badge: "tenHikes", threshold: 10, label: "Hike" },
  campsite: { field: "campsiteCount", badge: "tenCampsites", threshold: 10, label: "Campsite" },
  island: { field: "islandCount", badge: "fiveIslands", threshold: 5, label: "Island" }
};

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("profile", me.uid, { premium: profile?.premium });
  wireLogout();
  wireForm();
  loadHistory();
}

function wireForm(){
  document.getElementById("checkin-form").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const type = document.getElementById("ci-type").value;
    const name = document.getElementById("ci-name").value.trim();
    if(!name){ toast("Give it a name — which hike, campsite or island?"); return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Saving…";
    try{
      await addDoc(collection(db,"checkins"), {
        uid: me.uid, type, name, createdAt: serverTimestamp()
      });
      const meta = TYPE_META[type];
      const userRef = doc(db,"users",me.uid);
      let newBadge = null;
      await runTransaction(db, async (tx)=>{
        const snap = await tx.get(userRef);
        const data = snap.data();
        const newCount = (data[meta.field]||0) + 1;
        const badges = data.badges || [];
        const update = { [meta.field]: newCount };
        if(newCount >= meta.threshold && !badges.includes(meta.badge)){
          update.badges = [...badges, meta.badge];
          newBadge = meta.badge;
        }
        tx.update(userRef, update);
      });
      document.getElementById("ci-name").value = "";
      toast(newBadge ? "New badge earned! 🏅" : `${meta.label} logged.`);
      loadHistory();
    }catch(err){
      console.error(err);
      toast("Couldn't save that check-in.");
    }
    btn.disabled = false; btn.textContent = "Log it";
  });
}

async function loadHistory(){
  const list = document.getElementById("checkin-history");
  const q = query(collection(db,"checkins"), where("uid","==",me.uid), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  if(snap.empty){
    list.innerHTML = `<p style="color:var(--color-ink-soft);font-size:13.5px;">Nothing logged yet.</p>`;
    return;
  }
  const icons = { hike: "🥾", campsite: "⛺", island: "🏝️" };
  list.innerHTML = snap.docs.map(d=>{
    const c = d.data();
    return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--color-border-2);">
      <span style="font-size:18px;">${icons[c.type]||"📍"}</span>
      <div><div style="font-weight:600;font-size:14px;">${escapeHtml(c.name)}</div>
      <div style="font-size:12px;color:var(--color-ink-soft);text-transform:capitalize;">${c.type}</div></div>
    </div>`;
  }).join("");
}
