# Domain Context

## Check-in

A daily mood log the user records once per day during an active round. Stored as a flat global list (not nested inside a Round) and linked to rounds at runtime via date-range matching.

A check-in has:
- **date** — `YYYY-MM-DD`
- **mood** — one of `struggling`, `neutral`, or `strong`
- **note** — optional free-text reflection (max 280 chars)

Check-ins carry no `roundId`. They are linked to rounds at runtime by date-range matching — a check-in belongs to the round whose `startDate`–`endDate` window contains its date. See ADR 0002.

## Mood

The emotional state a user self-reports at check-in time. Three states, each with a canonical emoji:

| Mood | Emoji |
|------|-------|
| `struggling` | 😤 |
| `neutral` | 😐 |
| `strong` | 💪 |

## Relapse

A user-logged event that resets momentum within a round. The app does not define *what* the relapse was — users self-apply the label. Tracking porn-only vs. PMO (porn + masturbation + orgasm) is intentionally out of scope for now; that distinction may be introduced in a future version.

A relapse's `timestamp` need not be the moment of logging — the user may **backdate** it to record a relapse that happened earlier and was forgotten. A backdated relapse is still a normal `Relapse`; backdating is a logging-time choice, not a distinct entity. The pickable range is constrained to `[max(round.startDate, lastRelapseTimestamp), now]` — a relapse can never be inserted *before* an existing one, which keeps a round's relapses always in chronological order. See ADR 0005.
_Avoid_: "Late-logged relapse", "retroactive entry" — both describe the same thing as "backdated relapse."

## Round

A 90-day attempt. Has a start date, an optional end date (null if active), and a list of relapse events. Multiple rounds accumulate over time; only one can be active at a time.

## Target User

Someone specifically trying to break free from pornography use. The 90-day frame is grounded in pornography-specific brain-rewiring research, not general habit formation. The app is not a generic habit tracker.

## App Name

**90 Days Recovery Tracker** — deliberately generic enough to be discreet on a home screen (no "porn" in the title), while still being honest about the commitment. "Recovery" covers the porn-recovery framing without requiring explicit labelling in the app icon or notification banners.

## Summary (AI Summary / Recap)

An on-demand, AI-generated **reflective recap** of a user's own check-in and relapse data
for a round — a supportive mirror ("22 check-ins, mostly strong; both relapses followed
struggling days"). It is deliberately **not** coaching or medical/therapeutic advice.
Generated only when the user taps a button, never automatically. Only **aggregate stats +
mood labels** are sent to the LLM to produce it — raw check-in notes never leave the device.
The generated summary text is the only AI-related thing stored server-side. Planned feature;
see ADR 0006.
_Avoid_: "AI insights", "AI coach", "advice" — the recap does not advise.

## Account

An optional **email-based login**. Login is the single gate for both AI Summaries and cloud
backup, and is the point at which the user consents to their data leaving the device.
No-login users keep the full local app with zero server footprint. Accounts never ask for a
real name — email is the only personal datum. Account deletion wipes email, stored summaries,
and diamond balance (unspent diamonds forfeited, with a clear upfront warning). See ADR 0006.

## Diamond

A consumable in-app currency, purchased via IAP (RevenueCat), spent to generate AI Summaries
beyond the free capped allowance. The balance is authoritative **server-side** (Supabase);
the backend verifies-and-deducts before each generation. A consumable, not a subscription.
Deferred to v2 — v1 ships AI Summaries free-but-capped. See ADR 0006.
_Avoid_: "credits", "coins", "tokens" — "tokens" especially collides with LLM tokens.

## Backup

Server-side (Supabase) storage of a logged-in user's generated **Summaries only** — not raw
check-ins or relapse notes, which stay on-device. "Backing up the summaries" is intentionally
a smaller, more private feature than full journal/cloud sync (which was rejected). See ADR 0006.

## Explicitness Policy

Two surfaces, two rules:

- **Store listing (App Store / Play Store):** Explicit. Says "porn" directly in the description and keywords. Users are in a deliberate discovery context; discoverability matters.
- **In-app UI:** Explicit on the onboarding welcome screen only ("Built to help you break free from porn. One day at a time."). All subsequent surfaces — notifications, widgets, home screen, history, check-in — use neutral language ("relapse", "recovery", "clean days"). Reason: these surfaces are ambient and potentially visible to others.
