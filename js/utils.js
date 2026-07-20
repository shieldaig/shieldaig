// ============================================================
// Shared helpers used across every page.
// ============================================================

export const ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6 6-2z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  heartFill: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
  comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`
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

// current page key used to highlight nav ("feed" | "profile" | "messages" | "upload")
export function renderNav(active, uid, unreadCount = 0){
  const nav = document.getElementById("sidenav");
  const bottom = document.getElementById("bottomnav");
  const items = [
    {key:"feed", href:"index.html", icon:ICONS.home, label:"Feed"},
    {key:"upload", href:"upload.html", icon:ICONS.plus, label:"New log"},
    {key:"messages", href:"messages.html", icon:ICONS.chat, label:"Messages", badge: unreadCount},
    {key:"profile", href:"profile.html", icon:ICONS.user, label:"Profile"}
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
    bottom.innerHTML = items.map(it=>`
      <a class="${it.key===active?"active":""}" href="${it.href}">${it.icon}</a>
    `).join("");
  }
}

export function fileToStoragePath(uid, file, folder){
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  return `${folder}/${uid}/${Date.now()}_${safe}`;
}
