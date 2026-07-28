# Handoff: AI Summary Feature — decisions settled, ready to build v1

## Status
The design grilling is **complete**. All architecture/product/privacy/monetization decisions
are settled and recorded in **`docs/adr/0006-ai-summary-architecture.md`** (the authoritative
source). Domain vocabulary (Summary, Account, Diamond, Backup) is in **`CONTEXT.md`**.
Provider research is in **`docs/research/llm-provider-data-policies.md`**.

This doc is a short orientation for whoever builds it next. Do not re-litigate the decisions
below — open ADR 0006 if you need the reasoning.

## The project
- Repo: `/Users/sacmon/git/github/90-days-nf-timer` — Expo SDK 54 / React Native, a 90-day
  recovery tracker. Currently **local-only** (AsyncStorage, no backend, no accounts).
- Data feeding a summary: `Round`, `RelapseEvent`, `CheckInEntry` (mood + optional note).
  Types in `types/timer.ts`; persistence in `services/storage.ts`; mood aggregation in
  `utils/insights.ts`.
- Sensitive-topic app — privacy is first-class.

## Settled decisions (see ADR 0006 for full reasoning)
- **Feature:** on-demand *reflective recap* (a mirror of the user's data). NOT advice.
- **Backend:** Supabase all-in-one (Auth + Postgres + Edge Functions). The Edge Function is
  the LLM proxy and holds the API key as a secret; the app never calls the LLM directly.
- **Provider/model:** Anthropic Claude, **Claude Haiku 4.5** (~⅓¢ per recap). Set a **hard
  monthly spend cap** at the provider.
- **Identity:** email login **gates AI + backup**; no-login users stay fully local. Login is
  the data-sharing consent point.
- **Data:** DB stores **only generated summaries**. Only **aggregate stats + mood labels**
  are sent to the LLM — never raw notes.
- **Trust:** no real-name field ever; email is the only personal datum; plain-language
  in-app privacy promise; account deletion wipes email + summaries + balance.
- **Monetization:** consumable **Diamonds** via **RevenueCat**, balance in Supabase, Edge
  Function verifies-and-deducts before each call. Subscriptions deferred.

## Build sequence
- **v1 (build now):** email login + AI summary (free but **capped count**) + summary backup
  + account deletion. Note: the "free" summary still runs through paid Claude — it's a
  loss-leader (~⅓¢ each, ≈ signups × ⅓¢ total exposure), not a free LLM tier.
- **v2 (fast follow):** Diamonds + RevenueCat, priced from observed v1 usage.

## Suggested first implementation steps for v1
1. Stand up Supabase (Auth email/password + a `summaries` table keyed by user id).
2. Write the Edge Function: verify the Supabase auth token → build a prompt from **aggregate
   stats only** → call Claude Haiku (key as Edge Function secret) → store + return the summary.
   The Anthropic `claude-api` skill has current SDK/model details.
3. App: an optional login screen (no real-name field) + a "Generate summary" button behind it
   + a screen listing past summaries (the backup) + account deletion with the diamond warning
   (the warning copy exists now even though diamonds are v2, to keep the deletion flow stable).
4. Free-summary cap enforced server-side (a per-account counter/flag).

## Suggested skills for the build
- **`claude-api`** — current Claude SDK usage, model IDs, and pricing for the Edge Function.
- **`mattpocock-skills:tdd`** — the pure aggregation/prompt-building logic is a good fit for
  test-first (the repo already keeps `__tests__/` for pure logic).
- **`mattpocock-skills:grilling`** — resume grilling when it's time to design the v2 diamond
  economics from real usage data.

## Style notes for working with this user (Sachin)
- New to backends, databases, and LLM APIs — define jargon, one concept at a time, confirm
  understanding before moving on. Responds well to one question at a time with a clear
  recommendation attached.
