# Shieldaig Premium — setup guide (no command line, anywhere)

Everything below is done by clicking around in web consoles — Firebase,
Google Cloud, and Stripe. No terminal, no CLI installs. You also don't need
a registered business yet — Stripe's **test mode** works the moment you sign
up, with fake cards. You only need real business details right at the end,
when you switch to taking live payments.

---

## Part A — Enable Blaze (needed for Cloud Functions)

1. Firebase console → your project → ⚙️ **Usage and billing** → **Modify plan** → choose **Blaze**.
2. It asks for a payment method (a personal card is fine) — it does **not** ask for business registration. You stay on the generous free tier unless you get very large amounts of traffic.

---

## Part B — Set up Stripe in UK test mode

1. Go to **stripe.com** → **Start now** / **Sign up**. Use your email, set a password.
2. When asked for country, choose **United Kingdom**. You can skip/defer the business details step for now — Stripe will let you explore the dashboard and use test mode immediately. Look for a banner or prompt like "Activate your account" — ignore it for now, that's the live-mode step for later.
3. In the top-left of the Stripe Dashboard there's a toggle labelled **Test mode** — make sure it's switched **on**. Everything you do while it's on uses fake money and test cards only; nothing real is ever charged.
4. In the left sidebar, go to **Product catalog** (sometimes under "More" or "Catalog") → **+ Add product**.
   - Name: `Shieldaig Premium`
   - Pricing model: **Recurring**
   - Price: **£5.00**, billing period **Monthly**
   - Save. Click into the product and copy the **Price ID** — it looks like `price_1AbCdEfGhIjKlM`. Save this somewhere, you'll need it in Part C.
5. Go to **Developers** (bottom-left) → **API keys**. Make sure you're still looking at **Test mode** keys. Copy the **Secret key** (starts `sk_test_...`). Keep this private — never put it in your GitHub repo or frontend code.
6. That's it for now — you'll come back here in Part D to set up the webhook once your function has a URL, and to grab a test card number when you're ready to try it.

---

## Part C — Deploy the Cloud Functions in Google Cloud Console

You'll repeat this same process **four times** — once per function — pasting
the exact same `functions/main.py` and `functions/requirements.txt` each
time, just changing the **Entry point** and the **environment variables**.

### One-time setup
1. Go to **console.cloud.google.com**. In the project dropdown at the top, select the **same project** as your Firebase project (Firebase projects are Google Cloud projects too — the name/ID matches what you saw in Firebase console → Project settings).
2. In the search bar at the top, type **Cloud Functions** and open it. If prompted to enable the Cloud Functions API (and Cloud Build / Artifact Registry / Eventarc APIs), click **Enable** — this is free to enable, you only pay for usage.

### Repeat this for each of the 4 functions
Click **Create Function**, then:

1. **Environment:** 2nd gen
2. **Function name:** use the entry point name exactly, e.g. `chatbot` (makes it easy to keep track)
3. **Region:** pick one close to the UK, e.g. `europe-west2` (London) — use the **same region for all four**
4. **Authentication:** choose **Allow unauthenticated invocations**. (This sounds like it removes security, but it doesn't — the function itself checks the caller's Firebase login inside the code. Stripe's webhook also needs to reach this with no Google-level auth.)
5. Click **Next**.
6. **Runtime:** Python 3.12
7. **Source code:** choose **Inline Editor**
8. You'll see tabs for `main.py` and `requirements.txt` — replace their contents with the matching files from this project.
9. **Entry point** field: type the function you're deploying right now — one of `chatbot`, `create_checkout_session`, `create_portal_session`, `stripe_webhook`.
10. Expand **Runtime, build, connections and security settings** → **Runtime environment variables** → **Add variable**, and add the ones listed below for *that specific function*.
11. Click **Deploy**. It takes 1–3 minutes.
12. Once deployed, click the function → **Trigger** tab → copy the **URL** shown there.

### Environment variables per function

| Function | Environment variables to add |
|---|---|
| `chatbot` | *(none needed)* |
| `create_checkout_session` | `STRIPE_SECRET_KEY` = your `sk_test_...`, `STRIPE_PRICE_ID` = your `price_...`, `SITE_URL` = your site's URL e.g. `https://shieldaig.github.io` |
| `create_portal_session` | `STRIPE_SECRET_KEY`, `SITE_URL` (same values as above) |
| `stripe_webhook` | `STRIPE_SECRET_KEY` (same value). Leave `STRIPE_WEBHOOK_SECRET` out for now — you don't have it yet, see Part D. |

### After all 4 are deployed

Open `js/functions-config.js` in your project and paste in the three URLs you copied (the webhook URL doesn't go here — only Stripe calls that one):

```js
export const FN_URLS = {
  chatbot: "https://chatbot-xxxxx-ew.a.run.app",
  createCheckoutSession: "https://create-checkout-session-xxxxx-ew.a.run.app",
  createPortalSession: "https://create-portal-session-xxxxx-ew.a.run.app"
};
```

---

## Part D — Connect Stripe's webhook

1. Back in Stripe (still **Test mode**) → **Developers** → **Webhooks** → **Add endpoint**.
2. Paste the **Trigger URL** of your deployed `stripe_webhook` function.
3. Under "Select events to listen to", add: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`.
4. Save. Click into the new endpoint and copy the **Signing secret** (starts `whsec_...`).
5. Back in Google Cloud Console → Cloud Functions → click on `stripe_webhook` → **Edit** → add the environment variable `STRIPE_WEBHOOK_SECRET` with that value → **Deploy** again (this redeploys with the new variable).

---

## Part E — Test the whole thing (still fake money)

1. Open `premium.html` on your live site, logged in.
2. Click **Start free trial**. You'll land on a Stripe-hosted checkout page.
3. Use Stripe's standard test card: **4242 4242 4242 4242**, any future expiry date (e.g. 12/30), any 3-digit CVC, any name/postcode.
4. Complete checkout. You should be redirected back to `premium.html?checkout=success`.
5. Check Firestore (console → Firestore → `users` → your account) — `premium` should now be `true` and `boostCredits` should be `3`.
6. Try the **AI Guide** (chatbot.html) and boosting one of your own posts from the feed — both should now work.
7. To test cancellation, click **Manage subscription** on the Premium page — this opens Stripe's own billing portal where you can cancel; the webhook will flip `premium` back to `false` when the subscription actually ends.

If something doesn't work: check the function's **Logs** tab in Cloud Functions Console — it shows exactly what error happened.

---

## Part F — Going live (once your business is registered)

1. In Stripe, complete **Activate your account** (business details, bank account for payouts).
2. Switch the dashboard to **Live mode**. Note: products, prices, and API keys in live mode are completely separate from test mode — recreate the "Shieldaig Premium" product there, and copy the **live** Price ID and **live** Secret key (`sk_live_...`).
3. Go back to each Cloud Function in Google Cloud Console, **Edit**, and replace the environment variables with the live values. Redeploy each.
4. Add a second webhook endpoint in Stripe **Live mode** pointing at the same `stripe_webhook` URL, and update `STRIPE_WEBHOOK_SECRET` with the new live signing secret.
5. Double-check `SITE_URL` matches your real final domain.
6. Your **Monzo Business account** needs no special integration — in Stripe's payout settings, connect it like any UK bank account, and Stripe pays out to it on its normal schedule.

## Honest caveats

- The chatbot is a free, simple keyword-matcher (`functions/main.py` → `KNOWLEDGE`) — expand that list any time to make it smarter. It will never cost you anything per message.
- The boost feature pins a post to the top of the feed for 48 hours — a first pass, easy to refine later.
- Test the full trial → renewal → cancellation cycle in Stripe test mode (Stripe's dashboard can simulate renewals) before going live, since monthly boost-credit resets depend on the `invoice.payment_succeeded` webhook firing correctly.
