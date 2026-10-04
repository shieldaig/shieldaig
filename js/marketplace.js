import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import {
  renderNav, escapeHtml, toast, compressImageToDataURL, showBusyNote, hideBusyNote,
  checkDiamondEligibility
} from "./utils.js";
import {
  collection, addDoc, doc, updateDoc, getDocs, query,
  where, serverTimestamp, runTransaction, increment
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, activeCategory = "all", pendingFile = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("marketplace", me.uid, { premium: profile?.premium });
  wireLogout();
  wireTabs();
  wireNewListing();
  loadListings();
  loadMyDeals();
}

// ------------------------------------------------------------------
// Browse listings
// ------------------------------------------------------------------
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
  let docs;
  try{
    const q = query(collection(db,"marketplace"), where("status","==","available"));
    const snap = await getDocs(q);
    docs = snap.docs.sort((a,b)=> (b.data().createdAt?.toMillis?.()||0) - (a.data().createdAt?.toMillis?.()||0));
  }catch(err){
    console.error(err);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Couldn't load the marketplace</h3><p>${err.message || "Check that firestore.rules has been published."}</p></div>`;
    return;
  }
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
          ${it.uid===me.uid ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%;" data-sell="${d.id}">Confirm sold to a buyer</button>` : ""}
        </div>
      </div>`;
  }).join("");
  grid.querySelectorAll("[data-sell]").forEach(btn=>{
    btn.addEventListener("click", ()=> initiateSale(btn.dataset.sell));
  });
}

// ------------------------------------------------------------------
// Seller: start a sale — looks up the buyer by username, marks the
// listing "pending" until the buyer confirms their side too.
// ------------------------------------------------------------------
async function initiateSale(itemId){
  const username = prompt("Enter the buyer's username to confirm this sale:");
  if(!username) return;
  const clean = username.trim().replace("@","").toLowerCase();
  if(clean === myProfile?.username){ toast("You can't buy your own listing."); return; }
  const q = query(collection(db,"users"), where("username","==",clean));
  const snap = await getDocs(q);
  if(snap.empty){ toast("No paddler found with that username."); return; }
  const buyerDoc = snap.docs[0];
  if(buyerDoc.id === me.uid){ toast("You can't buy your own listing."); return; }
  try{
    await updateDoc(doc(db,"marketplace",itemId), {
      status: "pending",
      buyerUid: buyerDoc.id,
      buyerUsername: clean,
      sellerConfirmed: true,
      buyerConfirmed: false
    });
    toast(`Marked pending — waiting for @${clean} to confirm the purchase.`);
    loadListings();
    loadMyDeals();
  }catch(err){ console.error(err); toast("Couldn't update listing."); }
}

// ------------------------------------------------------------------
// "My Deals" — shows purchases awaiting MY confirmation (as buyer),
// and sales I've started that are awaiting the buyer (as seller).
// ------------------------------------------------------------------
async function loadMyDeals(){
  const wrap = document.getElementById("my-deals");
  let buying = [], selling = [];
  try{
    const buyQ = query(collection(db,"marketplace"), where("buyerUid","==",me.uid));
    const sellQ = query(collection(db,"marketplace"), where("uid","==",me.uid));
    const [buySnap, sellSnap] = await Promise.all([getDocs(buyQ), getDocs(sellQ)]);
    buying = buySnap.docs.filter(d=>d.data().status==="pending" && !d.data().buyerConfirmed);
    selling = sellSnap.docs.filter(d=>d.data().status==="pending");
    // Reconcile: any of my sold listings I haven't claimed transaction credit for yet.
    const toClaim = sellSnap.docs.filter(d=>d.data().status==="sold" && !d.data().sellerCounted);
    for(const d of toClaim) await claimSellerCredit(d.id);
  }catch(err){
    console.error(err);
    wrap.innerHTML = "";
    return;
  }

  if(buying.length === 0 && selling.length === 0){ wrap.innerHTML = ""; return; }

  wrap.innerHTML = `
    <div class="rail-card" style="max-width:none;">
      <h3>My Deals</h3>
      ${buying.map(d=>{
        const it = d.data();
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed var(--color-border);">
          <span style="font-size:13.5px;">Buying <strong>${escapeHtml(it.title)}</strong> — £${escapeHtml(String(it.price))}</span>
          <button class="btn btn-primary btn-sm" data-confirm-buy="${d.id}">Confirm purchase</button>
        </div>`;
      }).join("")}
      ${selling.map(d=>{
        const it = d.data();
        return `<div style="font-size:13.5px;padding:8px 0;border-bottom:1px dashed var(--color-border);">
          Selling <strong>${escapeHtml(it.title)}</strong> — waiting on @${escapeHtml(it.buyerUsername||"buyer")} to confirm
        </div>`;
      }).join("")}
    </div>`;

  wrap.querySelectorAll("[data-confirm-buy]").forEach(btn=>{
    btn.addEventListener("click", ()=> confirmPurchase(btn.dataset.confirmBuy));
  });
}

async function confirmPurchase(itemId){
  const itemRef = doc(db,"marketplace",itemId);
  const myRef = doc(db,"users",me.uid);
  try{
    await runTransaction(db, async (tx)=>{
      const itemSnap = await tx.get(itemRef);
      if(!itemSnap.exists()) throw new Error("Listing not found.");
      const it = itemSnap.data();
      if(it.buyerUid !== me.uid) throw new Error("This listing isn't waiting on your confirmation.");
      if(it.status !== "pending") throw new Error("This sale isn't pending anymore.");
      tx.update(itemRef, { status: "sold", buyerConfirmed: true });
      tx.update(myRef, { completedTransactions: increment(1) });
    });
    toast("Purchase confirmed! 🎉");
    checkDiamondEligibility(db, me.uid);
    loadListings();
    loadMyDeals();
  }catch(err){
    console.error(err);
    toast(err.message || "Couldn't confirm purchase.");
  }
}

// Seller claims their own transaction credit once a sale is confirmed —
// kept as its own self-write so security rules stay simple (everyone
// only ever edits their own completedTransactions field).
async function claimSellerCredit(itemId){
  const itemRef = doc(db,"marketplace",itemId);
  const myRef = doc(db,"users",me.uid);
  try{
    await runTransaction(db, async (tx)=>{
      const itemSnap = await tx.get(itemRef);
      if(!itemSnap.exists()) return;
      const it = itemSnap.data();
      if(it.uid !== me.uid || it.status !== "sold" || it.sellerCounted) return;
      tx.update(itemRef, { sellerCounted: true });
      tx.update(myRef, { completedTransactions: increment(1) });
    });
    checkDiamondEligibility(db, me.uid);
  }catch(err){ console.error(err); }
}

// ------------------------------------------------------------------
// New listing
// ------------------------------------------------------------------
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
        showBusyNote(btn);
        try{ imageURL = await compressImageToDataURL(pendingFile, { maxDim: 900, maxBytes: 400000 }); }
        finally{ hideBusyNote(btn); }
      }
      await addDoc(collection(db,"marketplace"), {
        uid: me.uid,
        sellerName: myProfile?.displayName || me.displayName || "Paddler",
        title, category, condition, description, price, location, imageURL,
        status: "available",
        buyerUid: "", buyerUsername: "", sellerConfirmed: false, buyerConfirmed: false, sellerCounted: false,
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
