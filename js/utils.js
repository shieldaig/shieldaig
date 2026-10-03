import { auth } from "./firebase-config.js";

export const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  heartFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41L11 4H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2-6.4-3.6-6.4 3.6 1.4-7.2-5.3-5 7.2-.9z"/></svg>`,
  starFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2-6.4-3.6-6.4 3.6 1.4-7.2-5.3-5 7.2-.9z"/></svg>`,
  badge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>`
};

export function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function initials(name){
  if(!name) return "?";
  return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||"").join("");
}

export function avatarHTML(photoURL, name, size){
  const cls = `avatar avatar-${size}`;
  if(photoURL){
    return `<img class="${cls}" src="${escapeHtml(photoURL)}" alt="${escapeHtml(name)}">`;
  }
  return `<div class="${cls}">${initials(name)}</div>`;
}

export function timeAgo(date){
  if(!date) return "";
  const ts = date.toDate ? date.toDate() : new Date(date);
  const secs = Math.floor((Date.now() - ts.getTime())/1000);
  if(secs < 5) return "just now";
  if(secs < 60) return `${secs}s`;
  const mins = Math.floor(secs/60);
  if(mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs/24);
  if(days < 7) return `${days}d`;
  return ts.toLocaleDateString(undefined,{month:"short",day:"numeric",year: ts.getFullYear()!==new Date().getFullYear() ? "numeric": undefined});
}

let toastTimer;
export function toast(msg){
  let el = document.getElementById("global-toast");
  if(!el){
    el = document.createElement("div");
    el.id = "global-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("show"), 2600);
}

// ------------------------------------------------------------------
// NAV — Marketplace, AI Guide and Stats are core links visible to
// EVERY user (free included). "Premium" itself is a separate link to
// the upgrade/status page; the features it unlocks (chatbot replies,
// boosts) are gated inside those pages, not by hiding the nav link.
// ------------------------------------------------------------------
export function renderNav(active, uid, opts = {}){
  const { unreadCount = 0, premium = false } = opts;
  const nav = document.getElementById("sidenav");
  const bottom = document.getElementById("bottomnav");

  const items = [
    {key:"feed", href:"index.html", icon:ICONS.home, label:"Feed"},
    {key:"upload", href:"upload.html", icon:ICONS.plus, label:"New log"},
    {key:"marketplace", href:"marketplace.html", icon:ICONS.tag, label:"Marketplace"},
    {key:"chatbot", href:"chatbot.html", icon:ICONS.sparkle, label:"AI Guide"},
    {key:"stats", href:"checkin.html", icon:ICONS.badge, label:"Stats"},
    {key:"messages", href:"messages.html", icon:ICONS.chat, label:"Messages", badge: unreadCount},
    {key:"profile", href:"profile.html", icon:ICONS.user, label:"Profile"},
    {key:"premium", href:"premium.html", icon: premium ? ICONS.starFill : ICONS.star, label: premium ? "Premium" : "Go Premium"}
  ];

  if(nav){
    nav.innerHTML = `
      <a href="index.html" class="brand"><span>Shieldaig</span><small>NC500 · Paddlers' Log</small></a>
      <div class="navlist">
        ${items.map(it=>`
          <a class="navlink ${it.key===active?"active":""}" href="${it.href}">
            ${it.icon}<span class="label">${it.label}</span>
            ${it.badge ? `<span class="nav-badge">${it.badge}</span>` : ""}
          </a>`).join("")}
      </div>
      <div class="navfoot" id="nav-logout">
        ${ICONS.logout}<span class="label">Log out</span>
      </div>
    `;
  }
  if(bottom){
    // This bar is the ONLY nav below desktop width now (no separate
    // vertical icon rail), so it carries every link — kept small and
    // tight so all of them fit on one row.
    bottom.innerHTML = items.map(it=>`
      <a class="${it.key===active?"active":""}" href="${it.href}" title="${it.label}">${it.icon}
        ${it.badge ? `<span class="nav-badge">${it.badge}</span>` : ""}
      </a>
    `).join("");
  }
}

// Firestore documents cap out at 1MB, and images get ~33% bigger once
// base64-encoded. This resizes + compresses a photo down to a data URL
// that comfortably fits in a document, no upload service required.
export function compressImageToDataURL(file, { maxDim = 1280, maxBytes = 550000 } = {}){
  return new Promise((resolve, reject)=>{
    if(!file.type.startsWith("image/")){
      reject(new Error("That file isn't a photo.")); return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = ()=>{
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if(width > height && width > maxDim){ height = Math.round(height * (maxDim/width)); width = maxDim; }
      else if(height > maxDim){ width = Math.round(width * (maxDim/height)); height = maxDim; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.75;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let attempts = 0;
      while(dataUrl.length > maxBytes && attempts < 6){
        quality -= 0.1;
        if(quality < 0.3 && canvas.width > 500){
          canvas.width = Math.round(canvas.width * 0.8);
          canvas.height = Math.round(canvas.height * 0.8);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          quality = 0.6;
        }
        dataUrl = canvas.toDataURL("image/jpeg", Math.max(quality, 0.3));
        attempts++;
      }
      if(dataUrl.length > maxBytes){
        reject(new Error("That photo is too large even after compression — try a smaller or simpler image."));
        return;
      }
      resolve(dataUrl);
    };
    img.onerror = ()=>{ URL.revokeObjectURL(objectUrl); reject(new Error("Couldn't read that image.")); };
    img.src = objectUrl;
  });
}

const SANTA_MSG = "🎅 Santa's a bit busy sending out gifts right now — that's why photos take a moment to process. Hang tight!";

export function showBusyNote(anchorEl){
  hideBusyNote(anchorEl);
  const note = document.createElement("div");
  note.className = "santa-note";
  note.style.cssText = "font-size:12.5px;color:var(--color-secondary);margin-top:6px;";
  note.textContent = SANTA_MSG;
  anchorEl.insertAdjacentElement("afterend", note);
  return note;
}
export function hideBusyNote(anchorEl){
  const existing = anchorEl.parentElement?.querySelector(".santa-note");
  if(existing) existing.remove();
}

// ------------------------------------------------------------------
// Calls a Cloud Function deployed via Google Cloud Console (no
// Firebase CLI / SDK involved — just a plain authenticated fetch).
// ------------------------------------------------------------------
export async function callFunction(url, data = {}){
  if(!url){
    throw new Error("This feature isn't connected yet — the function URL is missing from js/functions-config.js.");
  }
  const user = auth.currentUser;
  if(!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  let json = {};
  try{ json = await res.json(); }catch(e){}
  if(!res.ok){
    throw new Error(json.error || `Request failed (${res.status}).`);
  }
  return json;
}
