# ============================================================
# Shieldaig — Cloud Functions (plain Python, deployed by hand in
# Google Cloud Console — no Firebase CLI, no gcloud CLI needed).
#
# This ONE file contains all four functions. When you create each
# Cloud Function in the Console, you paste this exact file in every
# time and just change the "Entry point" field to the function name
# you want that particular deployment to run:
#
#   Entry point: chatbot                  -> the AI Guide
#   Entry point: create_checkout_session  -> starts a Stripe subscription
#   Entry point: create_portal_session    -> "Manage subscription" link
#   Entry point: stripe_webhook           -> Stripe calls this one itself
#
# Configuration is via plain environment variables (set in the
# Console's "Runtime, build, connections and security settings" when
# creating/editing the function) — NOT Firebase secrets, so there's
# nothing to install:
#   STRIPE_SECRET_KEY       e.g. sk_test_...
#   STRIPE_PRICE_ID         e.g. price_...        (checkout function only)
#   STRIPE_WEBHOOK_SECRET   e.g. whsec_...        (webhook function only)
#   SITE_URL                e.g. https://shieldaig.github.io
#
# See STAGES.md for the full click-by-click walkthrough.
# ============================================================

import os
import json
import functions_framework
from flask import jsonify
import firebase_admin
from firebase_admin import auth as fb_auth, firestore
import stripe

firebase_admin.initialize_app()
db = firestore.client()

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def _preflight():
    return ("", 204, CORS_HEADERS)


def _json(data, status=200):
    resp = jsonify(data)
    resp.status_code = status
    for k, v in CORS_HEADERS.items():
        resp.headers[k] = v
    return resp


def _verify_user(request):
    """Returns the caller's Firebase uid, or None if not signed in."""
    authz = request.headers.get("Authorization", "")
    if not authz.startswith("Bearer "):
        return None
    token = authz.split(" ", 1)[1]
    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        return None


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
                  "unenclosed land (go easy on the NC500's honeypot spots in "
                  "peak season, out of respect for the land and locals) — "
                  "always follow the Leave No Trace principles. For a proper "
                  "pitch, Applecross campsite and sites around Torridon and "
                  "Gairloch are popular with paddlers and hikers alike. Book "
                  "ahead for July-August.")
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
    low = message.lower()
    best_score, best_reply = 0, None
    for entry in KNOWLEDGE:
        score = sum(1 for kw in entry["keywords"] if kw in low)
        if score > best_score:
            best_score, best_reply = score, entry["reply"]
    return best_reply or FALLBACK


@functions_framework.http
def chatbot(request):
    if request.method == "OPTIONS":
        return _preflight()
    uid = _verify_user(request)
    if not uid:
        return _json({"error": "Sign in required."}, 401)
    user_snap = db.collection("users").document(uid).get()
    if not user_snap.exists or not user_snap.to_dict().get("premium"):
        return _json({"error": "This is a premium feature. Start your free trial to use the guide."}, 402)
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return _json({"error": "Message is empty."}, 400)
    return _json({"reply": get_bot_reply(message)})


# ------------------------------------------------------------------
# 2. STRIPE CHECKOUT — creates a subscription session with a free trial
# ------------------------------------------------------------------
@functions_framework.http
def create_checkout_session(request):
    if request.method == "OPTIONS":
        return _preflight()
    uid = _verify_user(request)
    if not uid:
        return _json({"error": "Sign in required."}, 401)

    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    price_id = os.environ.get("STRIPE_PRICE_ID")
    site_url = os.environ.get("SITE_URL", "https://shieldaig.github.io")

    user_ref = db.collection("users").document(uid)
    user = user_ref.get().to_dict() or {}

    customer_id = user.get("stripeCustomerId")
    if not customer_id:
        customer = stripe.Customer.create(metadata={"firebaseUID": uid})
        customer_id = customer.id
        user_ref.set({"stripeCustomerId": customer_id}, merge=True)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={} if user.get("trialUsed") else {"trial_period_days": 30},
        success_url=f"{site_url}/premium.html?checkout=success",
        cancel_url=f"{site_url}/premium.html?checkout=cancelled",
        metadata={"firebaseUID": uid},
    )
    return _json({"url": session.url})


@functions_framework.http
def create_portal_session(request):
    if request.method == "OPTIONS":
        return _preflight()
    uid = _verify_user(request)
    if not uid:
        return _json({"error": "Sign in required."}, 401)

    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    site_url = os.environ.get("SITE_URL", "https://shieldaig.github.io")

    user = db.collection("users").document(uid).get().to_dict() or {}
    customer_id = user.get("stripeCustomerId")
    if not customer_id:
        return _json({"error": "No subscription found."}, 400)
    portal = stripe.billing_portal.Session.create(customer=customer_id, return_url=f"{site_url}/premium.html")
    return _json({"url": portal.url})


# ------------------------------------------------------------------
# 3. STRIPE WEBHOOK — Stripe calls this on payment/subscription events.
# No auth header here (Stripe can't send a Firebase ID token) — this
# endpoint instead verifies Stripe's own signature on the request.
# ------------------------------------------------------------------
@functions_framework.http
def stripe_webhook(request):
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return ("Invalid signature", 400)

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
        ref = user_ref_from_customer(obj.get("customer"))
        if ref:
            ref.set({"boostCredits": 3}, merge=True)

    return ("ok", 200)
