import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, toast, callFunction } from "./utils.js";
import { FN_URLS } from "./functions-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user;
  renderNav("premium", me.uid, { premium: profile?.premium });
  wireLogout();

  const params = new URLSearchParams(location.search);
  if(params.get("checkout") === "success") toast("Welcome to Premium! 🎉");
  if(params.get("checkout") === "cancelled") toast("Checkout cancelled — no charge made.");

  onSnapshot(doc(db,"users",me.uid), (snap)=> renderStatus(snap.data()));
}

function renderStatus(p){
  const root = document.getElementById("premium-root");
  if(p.premium){
    root.innerHTML = `
      <div class="rail-card" style="max-width:420px;">
        <h3>★ You're on Premium</h3>
        <p style="font-size:13.5px;color:var(--color-ink-soft);">£5/month · ${p.boostCredits||0} post boosts remaining this month.</p>
        <button class="btn btn-ghost btn-block" id="manage-btn">Manage subscription</button>
      </div>`;
    document.getElementById("manage-btn").addEventListener("click", openPortal);
  }else{
    root.innerHTML = `
      <div class="rail-card" style="max-width:420px;">
        <h3>Shieldaig Premium — £5/month</h3>
        <ul style="font-size:13.5px;color:var(--color-ink-soft);padding-left:18px;margin:10px 0;">
          <li>AI Guide — ask about kayaking, hikes, islands, campsites</li>
          <li>3 post boosts a month to pin your logs to the top of the feed</li>
          <li>Support Shieldaig's development</li>
        </ul>
        <p style="font-size:12.5px;color:var(--color-secondary);">${p.trialUsed ? "" : "Includes a 30-day free trial — cancel any time before it ends and you won't be charged."}</p>
        <button class="btn btn-primary btn-block" id="start-btn">${p.trialUsed ? "Subscribe — £5/mo" : "Start free trial"}</button>
      </div>`;
    document.getElementById("start-btn").addEventListener("click", startCheckout);
  }
}

async function startCheckout(){
  const btn = document.getElementById("start-btn");
  btn.disabled = true; btn.textContent = "Redirecting…";
  try{
    const res = await callFunction(FN_URLS.createCheckoutSession);
    window.location.href = res.url;
  }catch(err){
    console.error(err);
    toast(err.message || "Couldn't start checkout.");
    btn.disabled = false; btn.textContent = "Start free trial";
  }
}

async function openPortal(){
  const btn = document.getElementById("manage-btn");
  btn.disabled = true; btn.textContent = "Opening…";
  try{
    const res = await callFunction(FN_URLS.createPortalSession);
    window.location.href = res.url;
  }catch(err){
    console.error(err);
    toast(err.message || "Couldn't open billing portal.");
    btn.disabled = false; btn.textContent = "Manage subscription";
  }
}
