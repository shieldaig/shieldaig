import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, avatarHTML, escapeHtml, timeAgo, toast, compressImageToDataURL, showBusyNote, hideBusyNote } from "./utils.js";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query,
  where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, activeCategory = "all", pendingFile = null;

const CATEGORIES = ["jacket","tent","sleeping bag","grill","other"];

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("marketplace", me.uid, { premium: profile?.premium });
  wireLogout();
  wireTabs();
  wireNewListing();
  loadListings();
}

function wireTabs(){
  document.getElementById("cat-tabs").addEventListener("click",(e)=>{
    const tab = e.target.closest("[data-cat]");
    if(!tab) return;
    activeCategory = tab.dataset.cat;
    document.querySelectorAll("#cat-tabs .profile-tab").forEach(t=>t.classList.toggle("active", t===tab));
    loadListings();
  });
}

async function loadListings(){
  const grid = document.getElementById("market-grid");
  grid.innerHTML = `<div class="loader"></div>`;
  let q = query(collection(db,"marketplace"), where("status","==","available"), orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  let docs = snap.docs;
  if(activeCategory !== "all") docs = docs.filter(d=>d.data().category === activeCategory);
  if(docs.length === 0){
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Nothing listed yet</h3><p>Be the first to sell your gear.</p></div>`;
    return;
  }
  grid.innerHTML = docs.map(d=>{
    const it = d.data();
    return `
      <div class="rail-card" style="padding:0;overflow:hidden;">
        ${it.imageURL ? `<img src="${escapeHtml(it.imageURL)}" alt="" style="width:100%;height:150px;object-fit:cover;">` : `<div style="height:150px;background:var(--color-bg-alt);display:flex;align-items:center;justify-content:center;color:var(--color-ink-soft);font-size:13px;">No photo</div>`}
        <div style="padding:12px 14px;">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <strong style="font-size:14px;">${escapeHtml(it.title)}</strong>
            <span class="stamp" style="color:var(--color-primary-d);font-weight:700;">£${escapeHtml(String(it.price))}</span>
          </div>
          <div style="font-size:12.5px;color:var(--color-ink-soft);text-transform:capitalize;margin:2px 0 6px;">${escapeHtml(it.category)} · ${escapeHtml(it.condition)}</div>
          <p style="font-size:13px;margin:0 0 8px;">${escapeHtml(it.description||"")}</p>
          <div style="font-size:12px;color:var(--color-ink-soft);display:flex;justify-content:space-between;align-items:center;">
            <span>📍 ${escapeHtml(it.location||"NC500")}</span>
            <a href="messages.html?uid=${it.uid}" class="btn-text" style="font-weight:600;">Message seller</a>
          </div>
          ${it.uid===me.uid ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%;" data-mark-sold="${d.id}">Mark as sold</button>` : ""}
        </div>
      </div>`;
  }).join("");
  grid.querySelectorAll("[data-mark-sold]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      try{
        await updateDoc(doc(db,"marketplace",btn.dataset.markSold), { status:"sold" });
        toast("Marked as sold.");
        loadListings();
      }catch(err){ console.error(err); toast("Couldn't update listing."); }
    });
  });
}

function wireNewListing(){
  const openBtn = document.getElementById("new-listing-btn");
  const modalWrap = document.getElementById("listing-modal");
  openBtn.addEventListener("click", ()=> modalWrap.classList.remove("hidden"));
  document.getElementById("listing-cancel").addEventListener("click", ()=> closeModal());
  const fileInput = document.getElementById("li-photo");
  const preview = document.getElementById("li-preview");
  fileInput.addEventListener("change", ()=>{
    const f = fileInput.files[0];
    if(!f) return;
    pendingFile = f;
    preview.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="" style="width:100%;border-radius:8px;margin-top:8px;">`;
  });

  document.getElementById("listing-form").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const title = document.getElementById("li-title").value.trim();
    const category = document.getElementById("li-category").value;
    const condition = document.getElementById("li-condition").value;
    const description = document.getElementById("li-desc").value.trim();
    const price = parseFloat(document.getElementById("li-price").value);
    const location = document.getElementById("li-location").value.trim();
    if(!title || !price || !location){ toast("Fill in the title, price and pickup location."); return; }

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Posting…";
    try{
      let imageURL = "";
      if(pendingFile){
        const note = showBusyNote(btn);
        try{
          imageURL = await compressImageToDataURL(pendingFile, { maxDim: 900, maxBytes: 400000 });
        } finally {
          hideBusyNote(btn);
        }
      }
      await addDoc(collection(db,"marketplace"), {
        uid: me.uid,
        sellerName: myProfile?.displayName || me.displayName || "Paddler",
        title, category, condition, description, price, location, imageURL,
        status: "available",
        createdAt: serverTimestamp()
      });
      toast("Listed!");
      closeModal();
      loadListings();
    }catch(err){
      console.error(err);
      toast(err.message || "Couldn't create the listing.");
    }
    btn.disabled = false; btn.textContent = "List it";
  });

  function closeModal(){
    modalWrap.classList.add("hidden");
    document.getElementById("listing-form").reset();
    preview.innerHTML = "";
    pendingFile = null;
  }
}
