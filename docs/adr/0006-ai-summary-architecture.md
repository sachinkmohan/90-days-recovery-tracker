# ADR 0006 — AI Summary: backend, privacy, and monetization architecture

## Status
Accepted (planning — not yet implemented)

## Context
The app is currently local-only (AsyncStorage, offline-first, no backend, no accounts).
We want to add an on-demand **AI-generated reflective summary** of a user's check-in and
relapse data. This is a sensitive-topic recovery app, so a user's mood and relapse data
leaving the device is a first-class privacy concern. The feature also costs money per
generation (LLM tokens), which introduces monetization and a backend for the first time.

Decisions were reached through a grilling session; this ADR records the outcome. Several
options were explicitly rejected — see Reasons.

## Decision

**Product shape**
- The summary is a **reflective recap** (a supportive mirror of the user's own data),
  **not** coaching or medical/therapeutic advice. Generated **on-demand** (button tap).

**Backend & inference**
- Inference runs through a **backend proxy**, never from the app (the app cannot hold an
  LLM API key). Stack: **Supabase** all-in-one — Auth + Postgres + Edge Functions.
- The LLM call is made inside a **Supabase Edge Function** that holds the provider API key
  as a server-side secret. The app never calls the LLM directly.
- **Provider = Anthropic Claude; model = Claude Haiku 4.5** (~⅓¢ per short recap). A **hard
  monthly spend cap** is set at the provider as a runaway-cost seatbelt.

**Identity**
- **Login (email account) gates both AI and backup.** No-login users keep the full local
  app with zero server footprint. Logging in is the explicit data-sharing consent checkpoint.

**Data handling (privacy-minimizing)**
- The database stores **only the generated summaries** (+ user id, date). Raw check-in
  free-text notes stay on-device and are never persisted server-side.
- **Only aggregate stats + mood labels are sent to the LLM** — never raw free-text notes.
- **Account deletion** wipes the auth record (email), stored summaries, and diamond balance.
  Unspent diamonds are forfeited, with a clear upfront warning before deletion.

**Monetization**
- Paid generations use consumable **Diamonds** via **RevenueCat** (Apple/Google IAP). The
  **balance lives in Supabase**; the Edge Function **verifies-and-deducts before every AI
  call**. Subscriptions are deferred.

**Sequencing**
- **v1** = login + AI summary (free but capped count) + summary backup + account deletion.
- **v2** = Diamonds + RevenueCat, priced by observed v1 usage.
- Even the "free" summary runs through paid Claude — it is a **loss-leader we fund**
  (~⅓¢ each), not a free LLM tier.

## Reasons
- **Reflective recap, not advice:** advice-giving on addiction/recovery carries real legal
  and app-store risk and is the hardest to get right; a recap is useful, safe, and cheap.
- **Supabase over Firebase+Cloudflare:** Firebase's free Spark plan blocks the outbound LLM
  call, forcing a separate proxy host. Supabase keeps auth, DB, and the proxy in one place —
  fewer moving parts for a solo, first-time-backend developer.
- **Claude over Gemini free tier:** Gemini's *free* tier may use submitted content for
  product improvement and human review, and its terms warn against submitting sensitive
  data — disqualifying for relapse notes. All paid tiers (Claude/OpenAI/Gemini) don't train
  on data; Claude was chosen for the clearest written commitments and a clean ~30-day
  default deletion. True zero-retention isn't self-serve for an indie developer, so the
  honest promise is "not trained on, deleted within ~30 days." See
  `docs/research/llm-provider-data-policies.md`.
- **Aggregates-only to the LLM:** with no true zero-retention available, minimizing what is
  sent makes the privacy promise true regardless of provider retention.
- **Login gates AI/backup:** gives paid/backed-up users a stable server identity to meter
  Diamonds against, while keeping non-paying users fully local and server-invisible. Removes
  the need to meter anonymous users.
- **Diamonds are prepaid + server-gated + provider-capped:** revenue arrives before cost;
  the only real exposure is free-summary cost (≈ signups × ⅓¢), and a provider spend cap
  makes a runaway bill structurally impossible.
- **AI-first sequencing:** diamond pricing can't be set correctly until real usage is
  observed; shipping the AI with capped free summaries *is* that experiment. Deferring IAP
  also avoids letting payment-review friction block the first launch.

## Rejected alternatives
- On-device LLM (kills monetization rationale, poor quality on older phones, immature on
  Expo). User-supplied API keys (bad UX, kills monetization).
- Full journal/cloud sync (a much larger, less private product than "back up the summaries").
- Anonymous-by-default accounts (unnecessary once login gates AI + backup).
- Building the full paid pipeline before validating the core feature.
