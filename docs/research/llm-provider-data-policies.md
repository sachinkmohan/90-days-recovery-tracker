# LLM Provider API Data-Usage, Retention & Training Policies

**Context:** Evaluating Google Gemini API, OpenAI API, and Anthropic Claude API for a privacy-sensitive
NoFap / addiction-recovery mobile app that would send users' emotional check-in data and relapse notes
to an LLM to generate a reflective summary.

**Sources accessed:** 2026-07-28. All claims below are drawn from first-party provider documentation,
terms of service, and privacy centers. Direct URLs are cited inline. Where the official wording was
ambiguous or could not be verified from a primary source, this is called out explicitly.

---

## Summary table

| Question | Google Gemini API | OpenAI API | Anthropic Claude API |
|---|---|---|---|
| **1. Free tier — used to train / improve models? Human review?** | **Yes.** Free ("Unpaid") tier content is used to improve Google products, and **human reviewers may read, annotate, and process** input/output (disconnected from account/API key first). | Historically the OpenAI API has **no free-forever inference tier** (usage is billed; new accounts may get limited trial credit). API data is **not** used for training by default on any paid usage. No separate "free-tier trains on you" carve-out documented. | **No free API tier that trains on you.** The Claude *API* is commercial/paid; commercial inputs/outputs are **not** used for training by default. (Consumer Claude Free/Pro/Max have separate terms and are out of scope for API use.) |
| **2. Paid/standard API — trained on by default?** | **No.** On Paid Services, Google does not use prompts or responses to improve its products. | **No.** Since 2023-03-01, API data is not used to train/improve models unless you opt in. | **No.** By default Anthropic does not use commercial-product (API) inputs/outputs to train models. |
| **3. Default retention on paid API; ZDR available & conditions?** | Logs kept for a **limited period** solely for abuse/policy-violation detection and legal disclosure. No fixed public number for standard Gemini API. **ZDR is not a self-serve default**; stronger no-logging guarantees are via Vertex AI / enterprise, not the standard AI-for-Developers key. | **Up to 30 days** for abuse monitoring, then deleted (unless legally required). **ZDR available** but requires **prior approval by OpenAI + a qualifying use-case + additional requirements** (business customer). | **Within 30 days** default deletion of inputs/outputs. **ZDR available on request** but is **not self-serve** — requires contacting the Anthropic **sales team** and per-organization enablement (effectively an enterprise/negotiated arrangement). |
| **4. Enterprise / DPA / abuse-retention caveats** | Human review + product-improvement only on Unpaid tier; Paid tier still logs transiently for safety/legal. Advises: "Do not submit sensitive, confidential, or personal information to the Unpaid Services." | Even under ZDR, OpenAI reserves the right to make models ZDR-ineligible and to **retain + human-review** content to investigate severe-risk activity. Abuse logs otherwise 30 days. | Even under ZDR, flagged (trust & safety) or legally-required content may be retained **up to 2 years** (classification scores up to 7 years). Certain "Covered Models" force 30-day retention and cannot be used under ZDR. |

**Bottom line:** For a small indie developer on **default paid API terms with no negotiated contract**,
**none of the three offer self-serve zero-retention** — all three log transiently (~30 days on OpenAI and
Anthropic) for abuse monitoring. However, **all three guarantee no training-on-your-data by default on the
paid API.** See the recommendation at the end.

---

## 1. Google Gemini API (Google AI for Developers)

Primary source: **Gemini API Additional Terms of Service** — https://ai.google.dev/gemini-api/terms
(section "How Google Uses Your Data"), plus pricing/billing docs at https://ai.google.dev/gemini-api/docs/pricing
and https://ai.google.dev/gemini-api/docs/billing.

### Free / "Unpaid Services" tier
- **Data IS used to improve Google products.** The terms state Google "uses the content you submit to the
  Services and any generated responses to provide, improve, and develop Google products and services" and
  machine-learning technologies.
- **Humans CAN review it.** "Human reviewers may read, annotate, and process your API input and output."
  Google says it disconnects the data from your Google Account, API key, and Cloud project before reviewers
  see it.
- **Explicit warning in the terms:** "Do not submit sensitive, confidential, or personal information to the
  Unpaid Services."
- Source: https://ai.google.dev/gemini-api/terms

> For an addiction-recovery app, the free Gemini tier is disqualifying on its face: emotional check-ins and
> relapse notes are exactly the "sensitive / personal information" the terms warn against submitting, and
> that content would be used for product improvement and may be human-reviewed.

### Paid / "Paid Services" tier
- **Not used to improve products.** "Google doesn't use your prompts (including associated system
  instructions, cached content, and files such as images, videos, or documents) or responses to improve our
  products." (Gemini API Additional Terms, "How Google Uses Your Data — Paid Services";
  https://ai.google.dev/gemini-api/terms)
- **Retention:** Google "logs prompts and responses for a limited period of time, solely for detecting and
  preventing violations of the Prohibited Use Policy... and any required legal or regulatory disclosures."
  Data "may be stored transiently or cached in any country in which Google or its agents maintain
  facilities." (https://ai.google.dev/gemini-api/terms)
- **Ambiguity noted:** The standard Gemini Developer API terms do **not** state a fixed numeric retention
  window (e.g. "30 days") for paid abuse logs — the wording is "a limited period of time." A hard number and
  ZDR-style guarantees are associated with **Vertex AI / Google Cloud** enterprise offerings rather than the
  developer API key. This could not be pinned to a specific day-count from the primary developer terms.
- Moving from Free to Paid requires **linking a billing account and prepaying** (https://ai.google.dev/gemini-api/docs/billing).
  Note: enabling billing is what moves you to Paid terms; verify the account is actually on a Paid tier, since
  free-tier rate-limited usage on a billed account has caused confusion in Google's own developer forum.

---

## 2. OpenAI API

Primary source: **Data controls in the OpenAI platform** —
https://developers.openai.com/api/docs/guides/your-data
(OpenAI's enterprise-privacy page https://openai.com/enterprise-privacy/ returned HTTP 403 to the fetcher and
could not be quoted directly; the developer data-controls doc covers the same policy.)

### Training on data (all tiers)
- **Not used to train by default.** "Data sent to the OpenAI API is not used to train or improve OpenAI
  models (unless you explicitly opt in to share data with us)." This has been the policy since
  **2023-03-01**. (https://developers.openai.com/api/docs/guides/your-data)
- OpenAI does not operate a "free-forever" inference tier for the API the way Google AI Studio does; API
  usage is billed. There is therefore no documented "free tier trains on you" carve-out.

### Retention (paid/standard API)
- **Up to 30 days.** OpenAI "may securely retain API inputs and outputs for up to 30 days to provide the
  services and to identify abuse. After 30 days, API inputs and outputs are removed from our systems, unless
  we are legally required to retain them."
- **Abuse monitoring logs** are "generated for all API feature usage and retained for up to 30 days, unless
  longer retention is required by law, or is reasonably necessary to protect our services or any third party
  from harm." (https://developers.openai.com/api/docs/guides/your-data)
- **Endpoint variance noted:** the docs indicate some endpoints/features have different retention (e.g.
  stateful features that retain "until deleted"). The 30-day figure is the abuse-monitoring default for
  standard stateless calls.

### Zero Data Retention (ZDR)
- **Available but gated.** "Eligible customers may have their customer content excluded from these abuse
  monitoring logs... by getting approved for the Zero Data Retention... controls. Currently, these controls
  are subject to prior approval by OpenAI and acceptance of additional requirements."
- ZDR-eligible endpoints include `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings`,
  `/v1/moderations`, image and audio endpoints, `/v1/realtime`, and `/v1/completions`.
- **Safety caveat even under ZDR:** "we reserve the right to make models ineligible for Zero Data
  Retention... if reasonably necessary to investigate or prevent severe risk activity... we may retain and
  human review customer content when using these models."
- Source: https://developers.openai.com/api/docs/guides/your-data

> ZDR is **not** available self-serve to a small indie developer without applying and qualifying as a
> business customer with an approved use-case.

---

## 3. Anthropic Claude API

Primary sources:
- Training: **"Is my data used for model training?"** — https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training
- Retention: **"How long do you store my organization's data?"** — https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
- ZDR: **"API and data retention"** (Claude Platform Docs) — https://platform.claude.com/docs/en/docs/build-with-claude/zero-data-retention

### Training on data
- **Not used to train by default.** "By default, we will not use your inputs or outputs from our commercial
  products (e.g. Claude for Work, Anthropic API, Claude Gov, etc.) to train our models." Training only occurs
  if you explicitly opt in (e.g. submitting feedback / thumbs up-down, or a partner program).
  (https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training)
- The commercial API is distinct from consumer products (Claude Free/Pro/Max), which have separate terms —
  those consumer terms are out of scope for an app calling the API with its own key.

### Retention (paid/standard API)
- **Deleted within 30 days by default.** For the Anthropic API, Anthropic "automatically delete[s] inputs and
  outputs on our backend within 30 days of receipt or generation," with exceptions.
  (https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)
- **Exceptions:** if a chat is flagged for a Usage Policy violation, inputs/outputs are retained **up to 2
  years** and trust & safety classification scores **up to 7 years**; data may also be retained "as required
  by law." Feedback submissions are kept 5 years.
- The retention docs also confirm: "Retained data is never used for model training without your express
  permission" and "Conversation content (your prompts and Claude's outputs) is not retained by default; the
  exception is Covered Models, which require 30-day retention."
  (https://platform.claude.com/docs/en/docs/build-with-claude/zero-data-retention)

### Zero Data Retention (ZDR)
- **Definition:** "Under a ZDR arrangement, Anthropic does not store customer prompts or responses at rest
  after the API response is returned."
- **How to get it:** "To request ZDR for your organization, contact the Anthropic sales team." It is
  **enabled per organization** and is **not** a self-serve toggle. The docs repeatedly direct customers to
  their "contract terms" or "account representative."
  (https://platform.claude.com/docs/en/docs/build-with-claude/zero-data-retention)
- **Scope:** ZDR applies to the core `/v1/messages` and token-counting endpoints and most stateless features.
  Stateful features (Batch API, Files API, code execution, Managed Agents) are **not** ZDR-eligible and
  retain data per their own policies.
- **Safety caveat even under ZDR:** "Even with ZDR or HIPAA arrangements in place, Anthropic may retain data
  where required by law or where it has been flagged by Anthropic's automated trust and safety systems. As a
  result, if a chat or session is flagged, Anthropic may retain inputs and outputs for up to 2 years."
- **Covered Models caveat:** Certain models (e.g. Claude Fable 5, Claude Mythos 5) are "Covered Models" that
  **require 30-day retention and are not available under ZDR** at all.
- HIPAA readiness is a separate, broader arrangement (BAA-based) and, unlike ZDR, can be **self-serve enabled
  in the Console with Anthropic's standard BAA** — relevant if the app ever handles PHI, though a recovery
  tracker's notes are generally not HIPAA-covered unless tied to a covered health entity.

---

## Recommendation

**For a small indie developer using default paid API terms with no negotiated/enterprise contract:**

### Do NOT use any free tier for this data — especially Google AI Studio / Gemini free tier.
The Gemini **Unpaid** tier explicitly uses submitted content for product improvement, allows **human review**,
and the terms literally warn: *"Do not submit sensitive, confidential, or personal information to the Unpaid
Services."* Emotional check-ins and relapse notes are precisely that. This is the single clearest
disqualifier in the whole comparison.

### Among the paid default tiers, the practical guarantee is nearly identical — and strong:
All three **do not train on your API data by default**, and both **OpenAI and Anthropic delete within ~30
days** (abuse-monitoring window), after which content is purged unless legally required or flagged for abuse.
Google's paid Gemini tier also does not train on your data, but its standard developer terms give a **vaguer
retention statement** ("a limited period of time") without a fixed public day-count, which is a mild
transparency disadvantage.

### Strongest "we don't store or train on your data" posture without an enterprise contract:
**Anthropic Claude API** and **OpenAI API** are effectively tied for the best *default* posture, with a slight
edge to **Anthropic** on documentation clarity and explicit contractual language ("Retained data is never
used for model training without your express permission"; clean 30-day default deletion; the commercial-vs-
consumer distinction is unambiguous). Choose **Anthropic** if you want the clearest written commitments and
plan to potentially grow into ZDR or a BAA later.

**Important honesty caveat for all three:** True **zero retention (ZDR) is NOT self-serve** on any of the
three for a small indie dev — OpenAI requires application + approval + qualifying use-case; Anthropic requires
contacting sales and per-org enablement (an enterprise-style arrangement); Google's equivalent no-logging
guarantees live on Vertex AI / enterprise rather than the standard developer key. So on **default paid
terms**, the realistic guarantee you actually get is: **"not trained on, deleted within ~30 days, transiently
logged for abuse detection, and possibly retained longer only if flagged for policy violations or required by
law."**

### Practical mitigation regardless of provider
Because none of the defaults are truly zero-retention, minimize what leaves the device: strip or pseudonymize
identifiers, avoid sending the rawest personal details, consider summarizing/aggregating on-device before the
API call, and be transparent in the app's privacy policy that check-in text is sent to a third-party LLM
provider that may retain it briefly (~30 days) for abuse monitoring.

---

### Points that were ambiguous or unverifiable from primary sources
- **Google Gemini paid retention has no fixed numeric window** in the developer Additional Terms — only "a
  limited period of time." A specific day-count could not be confirmed from the primary developer terms
  (numbers like this appear in Vertex AI / Cloud enterprise docs, a different product surface).
- **OpenAI's enterprise-privacy page** (https://openai.com/enterprise-privacy/) returned HTTP 403 to the
  automated fetcher; OpenAI claims here are sourced from the developer "Data controls" doc, which states the
  same policy.
- OpenAI does not publish a classic "free inference tier" for the API comparable to Google AI Studio's free
  tier, so the free-vs-paid training distinction is less relevant for OpenAI than for Google.
