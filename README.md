# Shieldaig 🛶

A social app for the North Coast 500 kayaking community — photo feed, direct
messaging, a gear marketplace, hike/campsite/island stats with badges, an AI
travel guide, and a £5/month Premium tier — built as a static site (GitHub
Pages) with Firebase as the backend (Auth + Firestore), plus a couple of
small Cloud Functions for the parts that need a server (Stripe payments and
hiding nothing, since the chatbot needs no key at all).

No build step, no framework — plain HTML/CSS/JS using the Firebase v10
modular SDK from a CDN, so GitHub Pages hosts it as-is.

**No Firebase Storage:** photos are resized/compressed in the browser and
saved directly as Firestore fields, so Storage (which needs the paid Blaze
plan) is never touched for photos.

---

## Base setup (do this first)

1. **Create a Firebase project** at console.firebase.google.com → Add project.
2. Click the **`</>`** icon on the project overview to register a web app, and copy the `firebaseConfig` object it gives you.
3. Paste those values into `js/firebase-config.js`.
4. **Build → Authentication → Get started** → enable **Email/Password**.
5. **Build → Firestore Database → Create database** (production mode, any region close to you).
6. In Firestore → **Rules**, paste the contents of `firestore.rules` from this project → **Publish**.
7. Push this project to a GitHub repo under your account and turn on **Settings → Pages** (Deploy from branch → `main` → `/root`).
8. Back in Firebase: **Authentication → Settings → Authorized domains → Add domain** → add your `*.github.io` domain (and your custom domain too, if you use one).

That's the free core of the app — feed, profiles, messaging, marketplace,
and stats/badges all work at this point with zero ongoing cost.

For the **Premium features** (AI Guide + Stripe subscriptions), see
**STAGES.md** — those need two extra free Cloud Functions, set up entirely
through a web console with no command-line tools.

## Project structure

```
shieldaig/
├── index.html, login.html, signup.html, upload.html, post.html,
│   profile.html, messages.html, marketplace.html, chatbot.html,
│   premium.html, checkin.html
├── css/style.css
├── js/
│   ├── firebase-config.js     ← put your Firebase keys here
│   ├── functions-config.js    ← put your Cloud Function URLs here (Stage 2)
│   ├── session.js, utils.js, auth.js
│   ├── feed.js, upload.js, post.js, profile.js, messages.js
│   ├── marketplace.js, checkin.js, chatbot.js, premium.js
├── functions/
│   ├── main.py                ← paste into Google Cloud Console (see STAGES.md)
│   └── requirements.txt
├── firestore.rules
└── STAGES.md                  ← Premium / Stripe / AI Guide setup walkthrough
```

## Data model (Firestore)

- `users/{uid}` — profile + `premium`, `boostCredits`, `trialUsed`, `stripeCustomerId` (server-only fields — see firestore.rules) + `hikeCount`/`campsiteCount`/`islandCount`/`badges`
- `posts/{postId}` — `uid, caption, mediaURL (base64 JPEG), likeCount, commentCount, boosted, boostedUntil, createdAt`
  - `posts/{postId}/likes/{uid}`, `posts/{postId}/comments/{commentId}`
- `checkins/{id}` — `uid, type (hike/campsite/island), name, createdAt`
- `marketplace/{id}` — `uid, title, category, condition, description, price, location, imageURL, status, createdAt`
- `chats/{chatId}` (id = both uids sorted + joined by `_`) — `participants, participantInfo, lastMessage, lastMessageAt`
  - `chats/{chatId}/messages/{id}`

## Known limits

- No video posting — photos only, kept under a Firestore document's 1MB limit via browser-side compression.
- Messaging search is exact-username only (no directory yet).
- The AI Guide is intentionally simple keyword-matching, not a general chatbot — see `functions/main.py` to expand its knowledge base.
