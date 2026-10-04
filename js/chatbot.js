import { requireAuth, wireLogout } from "./session.js";
import { renderNav, callFunction } from "./utils.js";
import { FN_URLS } from "./functions-config.js";

let me = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user;
  renderNav("chatbot", me.uid, { premium: profile?.premium });
  wireLogout();

  if(!profile?.premium){
    document.getElementById("chatbot-root").innerHTML = `
      <div class="empty-state">
        <h3>The AI Guide is a premium feature</h3>
        <p>Start your free trial to ask about kayaking spots, hikes, islands, campsites and more.</p>
        <a href="premium.html" class="btn btn-primary" style="margin-top:10px;">See Premium</a>
      </div>`;
    return;
  }
  wireChat();
}

function wireChat(){
  const box = document.getElementById("chat-msgs");
  addBubble("Ask me about kayaking spots, hikes, islands, campsites, weather or the best time to visit the NC500.", false);

  document.getElementById("chat-form").addEventListener("submit", async (e)=>{
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if(!text) return;
    addBubble(text, true);
    input.value = "";
    const typing = addBubble("…", false);
    try{
      const res = await callFunction(FN_URLS.chatbot, { message: text });
      typing.textContent = res.reply;
    }catch(err){
      console.error(err);
      typing.textContent = err.message || "Sorry, I couldn't answer that — try again in a moment.";
    }
    box.scrollTop = box.scrollHeight;
  });
}

function addBubble(text, mine){
  const box = document.getElementById("chat-msgs");
  const el = document.createElement("div");
  el.className = `bubble ${mine ? "mine" : "theirs"}`;
  el.textContent = text;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}
