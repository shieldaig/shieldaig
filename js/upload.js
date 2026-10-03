import { db } from "./firebase-config.js";
import { requireAuth, wireLogout } from "./session.js";
import { renderNav, toast, compressImageToDataURL, showBusyNote, hideBusyNote } from "./utils.js";
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let me = null, myProfile = null, file = null;

init();

async function init(){
  const { user, profile } = await requireAuth();
  me = user; myProfile = profile;
  renderNav("upload", me.uid, { premium: profile?.premium });
  wireLogout();
  wireForm();
}

function wireForm(){
  const drop = document.getElementById("drop-zone");
  const input = document.getElementById("file-input");
  const preview = document.getElementById("upload-preview");
  const caption = document.getElementById("caption");
  const postBtn = document.getElementById("post-btn");

  drop.addEventListener("click", ()=> input.click());
  drop.addEventListener("dragover", (e)=>{ e.preventDefault(); drop.classList.add("dragover"); });
  drop.addEventListener("dragleave", ()=> drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e)=>{
    e.preventDefault(); drop.classList.remove("dragover");
    if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener("change", ()=>{ if(input.files[0]) setFile(input.files[0]); });

  function setFile(f){
    if(!f.type.startsWith("image/")){ toast("Please choose a photo — video uploads aren't supported yet."); return; }
    file = f;
    preview.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`;
    preview.classList.remove("hidden");
    drop.classList.add("hidden");
    document.getElementById("upload-body").classList.remove("hidden");
  }

  document.getElementById("change-media").addEventListener("click", ()=>{
    file = null;
    preview.classList.add("hidden");
    drop.classList.remove("hidden");
    document.getElementById("upload-body").classList.add("hidden");
    input.value = "";
  });

  postBtn.addEventListener("click", async ()=>{
    const text = caption.value.trim();
    if(!file && !text){ toast("Add a photo or write something."); return; }
    postBtn.disabled = true; postBtn.textContent = "Posting…";
    try{
      let mediaURL = "", mediaType = "";
      if(file){
        mediaType = "image";
        showBusyNote(postBtn);
        try{ mediaURL = await compressImageToDataURL(file); }
        finally{ hideBusyNote(postBtn); }
      }
      await addDoc(collection(db,"posts"), {
        uid: me.uid,
        displayName: myProfile?.displayName || me.displayName || "Paddler",
        username: myProfile?.username || "",
        userPhotoURL: myProfile?.photoURL || "",
        caption: text,
        mediaURL, mediaType,
        likeCount: 0, commentCount: 0,
        boosted: false, boostedUntil: null,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db,"users",me.uid), { postCount: increment(1) }).catch(()=>{});
      toast("Logged 🛶");
      window.location.href = "index.html";
    }catch(err){
      console.error(err);
      toast(err.message || "Couldn't post — try again.");
      postBtn.disabled = false; postBtn.textContent = "Log it";
    }
  });
}
