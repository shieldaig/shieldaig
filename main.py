# ============================================================
# Shieldaig — Cloud Functions (Python, 2nd gen)
#
# Three functions:
#   1. chatbot                 — premium-only, your own rule-based
#                                 Scotland travel assistant (no paid AI API)
#   2. create_checkout_session — starts a Stripe subscription (with trial)
#   3. stripe_webhook          — Stripe calls this to tell us when a
#                                 payment/subscription changes
#
# SETUP (see STAGES.md for the full staged walkthrough):
#   firebase deploy --only functions
#   firebase functions:secrets:set STRIPE_SECRET_KEY
#   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
#   firebase functions:secrets:set STRIPE_PRICE_ID
# ============================================================

import json
from firebase_functions import https_fn, options
from firebase_functions.params import SecretParam
import firebase_admin
from firebase_admin import firestore
import stripe

firebase_admin.initialize_app()
db = firestore.client()

STRIPE_SECRET_KEY = SecretParam("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = SecretParam("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_ID = SecretParam("STRIPE_PRICE_ID")

# Change this once you know your real GitHub Pages / custom domain URL.
SITE_URL = "https://shieldaig.github.io"

# ------------------------------------------------------------------
# 1. CHATBOT — simple, free, rule-based. No external AI API, no cost.
# Add to KNOWLEDGE any time to make it smarter — it's just Python.
# ------------------------------------------------------------------
KNOWLEDGE = [
    {
        "keywords": ["kayak", "kayaking", "paddle", "paddling", "canoe"],
        "reply": ("For sea kayaking on the NC500, Applecross Bay is the most "
                  "sheltered spot to launch and great for beginners. Shieldaig "
                  "slipway and Loch Torridon give you dramatic mountain scenery "
                  "with calmer water than the open coast. More experienced "
                  "paddlers head to the Summer Isles near Achiltibuie or the "
                  "Sound of Arisaig further south. Always check the Met Office "
                  "marine forecast and tidal times before you launch.")
    },
    {
        "keywords": ["hike", "hiking", "walk", "walking", "munro", "mountain", "climb"],
        "reply": ("Torridon has some of Scotland's best hiking — Beinn Alligin "
                  "and Liathach are classic (and serious) Munro routes. For "
                  "something gentler, the Coire Mhic Fhearchair path below "
                  "Beinn Eighe has huge payoff for moderate effort. On Skye, "
                  "the Quiraing is a dramatic, less strenuous walk. Always "
                  "check the Scottish Avalanche Information Service in winter "
                  "and tell someone your route before setting off.")
    },
    {
        "keywords": ["island", "islands", "skye", "harris", "lewis", "orkney", "arran"],
        "reply": ("Skye is the easiest island to combine with the NC500 (bridge "
                  "access, no ferry needed) — the Quiraing and Old Man of Storr "
                  "are unmissable. For something quieter, Harris and Lewis have "
                  "some of the best beaches in Scotland (Luskentyre is "
                  "spectacular) but need a CalMac ferry booking well in advance "
                  "in summer. Orkney is further north with incredible Neolithic "
                  "sites like Skara Brae.")
    },
    {
        "keywords": ["camp", "camping", "campsite", "campervan", "tent", "wild camp"],
        "reply": ("Scotland's right to roam allows wild camping in most "
                  "unenclosed land (not in the NC500's honeypot spots in peak "
                  "season, out of respect for the land and locals) — always "
                  "follow the Leave No Trace principles. For a proper pitch, "
                  "Applecross campsite and sites around Torridon and Gairloch "
                  "are popular with paddlers and hikers alike. Book ahead for "
                  "July-August.")
    },
    {
        "keywords": ["weather", "forecast", "wind", "rain", "tide", "tides"],
        "reply": ("Check the Met Office mountain/marine forecasts specifically "
                  "(not just the general town forecast) — conditions change "
                  "fast on the west coast. For tides at a specific launch spot, "
                  "the Admiralty EasyTide site is the standard reference most "
                  "paddlers use.")
    },
    {
        "keywords": ["food", "eat", "restaurant", "pub", "whisky", "whiskey"],
        "reply": ("Gille Brighde in Diabaig and the Applecross Inn are both "
                  "well-loved stops after a day on the water. If you're into "
                  "whisky, several NC500 distilleries offer tours — Glenmorangie "
                  "and Glen Ord are both near the route.")
    },
    {
        "keywords": ["when", "best time", "season", "month"],
        "reply": ("May-June and September tend to be the sweet spot — long "
                  "daylight, fewer midges than July/August, and quieter roads "
                  "than peak summer. Winter paddling and hiking are for "
                  "experienced groups only given how fast weather turns.")
    },
]
FALLBACK = ("I'm a simple guide focused on the NC500 — try asking me about "
            "kayaking spots, hikes, islands, campsites, weather/tides, food, "
            "or the best time of year to visit.")

def get_bot_reply(message: str) -> str:
    words = set(message.lower().split())
    best_score, best_reply = 0, None
    for entry in KNOWLEDGE:
        score = sum(1 for kw in entry["keywords"] if kw in message.lower())
        if score > best_score:
            best_score, best_reply = score, entry["reply"]
    return best_reply or FALLBACK


@https_fn.on_call()
def chatbot(req: https_fn.CallableRequest) -> dict:
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required.")
    uid = req.auth.uid
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists or not user_snap.to_dict().get("premium"):
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                                   "This is a premium feature. Start your free trial to use the guide.")
    message = (req.data or {}).get("message", "").strip()
    if not message:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.INVALID_ARGUMENT, "Message is empty.")
    return {"reply": get_bot_reply(message)}


# ------------------------------------------------------------------
# 2. STRIPE CHECKOUT — creates a subscription session with a free trial
# ------------------------------------------------------------------
@https_fn.on_call(secrets=[STRIPE_SECRET_KEY, STRIPE_PRICE_ID])
def create_checkout_session(req: https_fn.CallableRequest) -> dict:
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required.")
    uid = req.auth.uid
    stripe.api_key = STRIPE_SECRET_KEY.value

    user_ref = db.collection("users").document(uid)
    user = user_ref.get().to_dict() or {}

    if user.get("trialUsed"):
        # Already had a free trial — Stripe will just start billing immediately.
        pass

    customer_id = user.get("stripeCustomerId")
    if not customer_id:
        customer = stripe.Customer.create(metadata={"firebaseUID": uid})
        customer_id = customer.id
        user_ref.set({"stripeCustomerId": customer_id}, merge=True)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": STRIPE_PRICE_ID.value, "quantity": 1}],
        subscription_data={} if user.get("trialUsed") else {"trial_period_days": 30},
        success_url=f"{SITE_URL}/premium.html?checkout=success",
        cancel_url=f"{SITE_URL}/premium.html?checkout=cancelled",
        metadata={"firebaseUID": uid},
    )
    return {"url": session.url}


@https_fn.on_call(secrets=[STRIPE_SECRET_KEY])
def create_portal_session(req: https_fn.CallableRequest) -> dict:
    if req.auth is None:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.UNAUTHENTICATED, "Sign in required.")
    stripe.api_key = STRIPE_SECRET_KEY.value
    user = db.collection("users").document(req.auth.uid).get().to_dict() or {}
    customer_id = user.get("stripeCustomerId")
    if not customer_id:
        raise https_fn.HttpsError(https_fn.FunctionsErrorCode.FAILED_PRECONDITION, "No subscription found.")
    portal = stripe.billing_portal.Session.create(customer=customer_id, return_url=f"{SITE_URL}/premium.html")
    return {"url": portal.url}


# ------------------------------------------------------------------
# 3. STRIPE WEBHOOK — Stripe calls this on payment/subscription events
# ------------------------------------------------------------------
@https_fn.on_request(secrets=[STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET])
def stripe_webhook(req: https_fn.Request) -> https_fn.Response:
    stripe.api_key = STRIPE_SECRET_KEY.value
    payload = req.get_data()
    sig_header = req.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET.value)
    except (ValueError, stripe.error.SignatureVerificationError):
        return https_fn.Response(status=400, response="Invalid signature")

    etype = event["type"]
    obj = event["data"]["object"]

    def user_ref_from_customer(customer_id):
        matches = db.collection("users").where("stripeCustomerId", "==", customer_id).limit(1).get()
        return matches[0].reference if matches else None

    if etype == "checkout.session.completed":
        uid = obj.get("metadata", {}).get("firebaseUID")
        if uid:
            db.collection("users").document(uid).set({
                "premium": True,
                "trialUsed": True,
                "stripeSubscriptionId": obj.get("subscription"),
                "boostCredits": 3,
            }, merge=True)

    elif etype in ("customer.subscription.updated", "customer.subscription.created"):
        ref = user_ref_from_customer(obj.get("customer"))
        if ref:
            active = obj.get("status") in ("active", "trialing")
            ref.set({"premium": active, "stripeSubscriptionId": obj.get("id")}, merge=True)

    elif etype == "customer.subscription.deleted":
        ref = user_ref_from_customer(obj.get("customer"))
        if ref:
            ref.set({"premium": False}, merge=True)

    elif etype == "invoice.payment_succeeded":
        # Monthly renewal — top the booster credits back up.
        ref = user_ref_from_customer(obj.get("customer"))
        if ref:
            ref.set({"boostCredits": 3}, merge=True)

    return https_fn.Response(status=200, response="ok")
