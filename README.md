# Shieldaig 🛶

A social app for the North Coast 500 kayaking community — a photo/video feed and
direct messaging, built as a static site (GitHub Pages) with Firebase as the
backend (Auth, Firestore, Storage).

No build step, no framework, no server to run — it's plain HTML/CSS/JS using
the Firebase v10 modular SDK loaded straight from a CDN, so GitHub Pages can
host it as-is.

---

## 1. Create your Firebase project

1. Go to **https://console.firebase.google.com** and click **Add project**.
2. Name it `shieldaig` (or anything you like) and finish the wizard. Google
   Analytics is optional — you can skip it.
3. Once the project loads, click the **`</>`  (Web)** icon on the project
   overview page to register a web app. Name it "Shieldaig Web" and click
   **Register app**. You do **not** need Firebase Hosting — you're using
   GitHub Pages instead.
4. Firebase will show you a `firebaseConfig` object. Copy it.

## 2. Drop your config into the project

Open `js/firebase-config.js` in this project and replace the placeholder
values with the ones Firebase gave you:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "shieldaig-xxxxx.firebaseapp.com",
  projectId: "shieldaig-xxxxx",
  storageBucket: "shieldaig-xxxxx.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

This file is safe to be public — Firebase web API keys aren't secret; access
is controlled by the security rules you set up below, not by hiding the key.

## 3. Turn on Authentication

1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 4. Create the Firestore database

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Start in production mode**, pick a region close to you, and
   create it.
3. Click the **Rules** tab and replace the default rules with the contents of
   `firestore.rules` from this project, then click **Publish**.

The app will prompt Firestore to create a couple of composite indexes the
first time it needs them (e.g. "posts by a user, newest first"). If a feature
throws a console error mentioning an index, Firestore gives you a direct link
in that error message — click it, click **Create index**, wait a minute, and
reload.

## 5. Turn on Storage

1. Go to **Build → Storage → Get started**, accept the defaults.
2. Click the **Rules** tab and replace the default rules with the contents of
   `storage.rules` from this project, then click **Publish**.

## 6. Push this project to GitHub

Since your GitHub username is `shieldaig`, create a new repository — for
example `shieldaig/shieldaig` or `shieldaig/shieldaig-app`. If you name the
repo exactly `shieldaig.github.io`, your site will be live at
`https://shieldaig.github.io` with no extra path.

```bash
cd shieldaig            # this project folder
git init
git add .
git commit -m "Shieldaig launch"
git branch -M main
git remote add origin https://github.com/shieldaig/shieldaig.git
git push -u origin main
```

## 7. Turn on GitHub Pages

1. On GitHub, open the repo → **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a
   branch**, branch `main`, folder `/ (root)`. Save.
3. GitHub will give you a URL (e.g. `https://shieldaig.github.io/shieldaig/`
   or `https://shieldaig.github.io/`). It takes a minute or two to go live.

## 8. Allow that domain in Firebase

Firebase Auth only allows sign-in from domains you've approved:

1. **Authentication → Settings → Authorized domains → Add domain**.
2. Add `shieldaig.github.io` (just the domain, no path).

That's it — visit your GitHub Pages URL, create an account, and you're
paddling.

---

## Project structure

```
shieldaig/
├── index.html          feed (home)
├── login.html
├── signup.html
├── upload.html          create a photo/video log entry
├── post.html            single post + comments
├── profile.html          own profile (edit) or ?uid=... for others
├── messages.html          conversation list + chat, ?uid=... opens a chat
├── css/style.css
├── js/
│   ├── firebase-config.js   ← put your keys here
│   ├── session.js           auth guard, logout
│   ├── utils.js              icons, formatting, nav rendering
│   ├── auth.js                login/signup form logic
│   ├── feed.js
│   ├── upload.js
│   ├── post.js
│   ├── profile.js
│   └── messages.js
├── firestore.rules      paste into Firestore → Rules
└── storage.rules         paste into Storage → Rules
```

## Data model (Firestore)

- `users/{uid}` — `displayName, username, bio, photoURL, postCount, createdAt`
- `posts/{postId}` — `uid, displayName, username, userPhotoURL, caption, mediaURL, mediaType, likeCount, commentCount, createdAt`
  - `posts/{postId}/likes/{uid}`
  - `posts/{postId}/comments/{commentId}`
- `chats/{chatId}` (id = the two user ids, sorted, joined by `_`) — `participants, participantInfo, lastMessage, lastMessageAt`
  - `chats/{chatId}/messages/{messageId}` — `senderId, text, createdAt`

## Known limits of this first version

- Search for people to message is by exact username (via the **+** button on
  Messages) — there's no directory/search page yet.
- No push notifications — messages and likes update live only while the tab
  is open.
- Comments load per-post on the post page; the feed only shows the count.

Both features you didn't ask for in v1 — Twitter-style standalone text
threads and TikTok-style full-screen video swiping — can be added later; the
data model already supports text-only posts and video posts, so it's mostly
new UI on top of what's here.
