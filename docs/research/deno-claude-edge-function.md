# Calling the Anthropic Claude API from a Supabase Edge Function (Deno)

**Context:** Resolving the Deno↔Claude call mechanism for the AI-summary Edge Function
described in `docs/adr/0006-ai-summary-architecture.md`. The function is a server-side proxy:
it verifies a Supabase auth token, builds a prompt from AGGREGATE stats only (no raw notes),
calls **Claude Haiku 4.5** (`claude-haiku-4-5`), stores the summary, and returns it. This doc
answers only "how does Deno call Claude", so the build spec can name the approach. It does not
design the whole function.

**Sources accessed:** 2026-07-28. All claims are drawn from first-party documentation
(Supabase docs, Anthropic Claude API docs, the official `@anthropic-ai/sdk` repo). Direct URLs
are cited inline. Where a fact could not be confirmed from a primary source it is called out
explicitly.

---

## TL;DR / Recommendation

For a solo indie dev's first backend, **use the official `@anthropic-ai/sdk` imported via the
`npm:` specifier**. It officially supports Deno (v1.28+), the Supabase Edge runtime is Deno-based,
`npm:` specifiers are the Supabase-recommended way to load npm packages, and the SDK handles
headers, retries, timeouts, and typed errors so there is less to get wrong. The raw `fetch`
fallback (section 2) is a fine alternative and is shown in full for reference — but for this
project the SDK is the lower-risk default. A single short Haiku call finishes in ~1–2s, well
inside every Edge Function limit (section 4). A copy-pasteable minimal function is at the end.

---

## 1. Can the official `@anthropic-ai/sdk` run in a Supabase Edge Function (Deno)?

**Yes.** Two facts combine to make this work:

- **Supabase Edge Functions run on Deno** and support importing npm packages via the `npm:`
  specifier (the recommended method): e.g. `import { createClient } from 'npm:@supabase/supabase-js@2'`.
  Import maps and CDN URLs (esm.sh, Skypack) are also supported, but `npm:` is the current best
  practice, with per-function `deno.json` for dependency config.
  Source: https://supabase.com/docs/guides/functions/import-maps
- **The official Anthropic TypeScript SDK officially supports Deno v1.28.0+** (alongside Node 20+,
  Bun, Cloudflare Workers, Vercel Edge Runtime, Nitro). The repo ships a `tsconfig.deno.json`,
  indicating first-class Deno support. React Native is explicitly not supported.
  Source: https://github.com/anthropics/anthropic-sdk-typescript

### How to import it in Deno

```ts
import Anthropic from 'npm:@anthropic-ai/sdk';
```

Pin a version in production (e.g. `npm:@anthropic-ai/sdk@0.32.1`) so deployments are reproducible.
esm.sh (`https://esm.sh/@anthropic-ai/sdk`) also works, but `npm:` is the Supabase-recommended path.
Source (npm specifier as recommended method): https://supabase.com/docs/guides/functions/import-maps

### Known gotchas

- **Node built-ins:** The SDK is written to be runtime-agnostic and officially targets edge
  runtimes (Cloudflare Workers, Vercel Edge) that have no Node built-ins, so it does not depend on
  Node-only APIs for the Messages call. Deno also provides `node:` compatibility shims if a
  transitive dependency reaches for one. (The SDK repo lists edge runtimes as supported; it does
  not document any required Node built-in for `messages.create`.)
  Source: https://github.com/anthropics/anthropic-sdk-typescript
- **`fetch`:** The SDK uses the platform `fetch`. Deno provides a global `fetch`, so no polyfill is
  needed. (Primary source did not detail fetch requirements, but Deno's built-in `fetch` satisfies
  the runtime-agnostic design.)
- **Streaming:** Not needed here — a short recap is a single non-streaming call. Streaming exists in
  the SDK if ever wanted, but avoid it for this use case to keep the function simple.
- **Browser guard:** irrelevant server-side (the SDK's `dangerouslyAllowBrowser` flag is only for
  running in a browser; an Edge Function is server-side).

---

## 2. Minimal raw `fetch` call to the Messages API from Deno

If you prefer zero dependencies, the Messages API is a single POST. Primary source for endpoint,
headers, body, and response shape: https://platform.claude.com/docs/en/api/messages

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Required headers:**
  - `x-api-key: <ANTHROPIC_API_KEY>`
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`

```ts
const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [
      { role: 'user', content: 'Write a 2-sentence supportive recap from these aggregate stats: ...' },
    ],
  }),
});

if (!res.ok) {
  // 400/401/403/429/5xx — see Anthropic error codes. res.status + body carry the detail.
  throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
}

const data = await res.json();
// Response shape (Messages API):
// { id, type:"message", role:"assistant",
//   content:[ { type:"text", text:"..." } ], model, stop_reason, usage:{...} }
const summary = data.content
  .filter((b: { type: string }) => b.type === 'text')
  .map((b: { text: string }) => b.text)
  .join('');
```

**Reading the text out:** the response `content` is an array of blocks; the generated text lives in
the `text` field of blocks where `type === "text"` (`data.content[0].text` in the simple case).
Filtering by `type: "text"` is the robust form since `content` can also hold non-text blocks.
Source: https://platform.claude.com/docs/en/api/messages

Notes:
- `claude-haiku-4-5` has a 200K context window and supports up to 64K output tokens; a recap needs
  only a small `max_tokens` (e.g. 128–400), which also bounds cost. (Model id and limits per the
  Claude model catalog; `claude-haiku-4-5` is the exact string — no date suffix.)
- The `x-api-key` header (not `Authorization: Bearer`) is what a standard API key uses.

---

## 3. Storing and reading the Anthropic API key inside the Edge Function

Store it as a **Supabase secret** and read it with **`Deno.env.get`** — it stays server-side and is
never shipped to the app. Source: https://supabase.com/docs/guides/functions/secrets

- **Set the secret (production):**
  ```bash
  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
  # or from a file:
  supabase secrets set --env-file ./.env
  ```
- **Read it inside the function (Deno):**
  ```ts
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  ```
- **Local development:** put it in `supabase/functions/.env` (or a custom file) and run
  `supabase functions serve <name> --env-file .env.local`. Never commit `.env` — add it to
  `.gitignore`.
- **It stays server-side:** Edge Functions execute on Supabase's servers, not on the device. The key
  lives only in the function's environment; the React Native app calls the Edge Function (with the
  user's Supabase auth token), and the function calls Anthropic. This is exactly the proxy shape ADR
  0006 requires — the app never holds the LLM key.
- **Default secrets available (no setup):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` /
  `SUPABASE_SECRET_KEYS`, `SUPABASE_ANON_KEY` / publishable keys, `SUPABASE_DB_URL`, etc. The secret
  keys are "safe to use in Edge Functions but should NEVER be used in a browser" — use these
  server-side to verify the auth token and write the summary row.
  Source: https://supabase.com/docs/guides/functions/secrets

**Limit to be aware of:** max 100 secrets per project, 48 KiB per secret — irrelevant for one API key.
Source: https://supabase.com/docs/guides/functions/limits

---

## 4. Relevant limits for a single short (~1–2s) Claude call

Source (all figures): https://supabase.com/docs/guides/functions/limits

| Limit | Free plan | Paid plans | Matters here? |
|---|---|---|---|
| Wall-clock duration (per request) | **150 s** | 400 s | No — a Haiku recap returns in ~1–2 s |
| CPU time (excludes async I/O wait) | **2 s** | 2 s | **Watch this.** The 2 s cap is *CPU* time; time spent awaiting the Anthropic HTTP response is async I/O and does **not** count. Building the prompt + parsing JSON is trivially under 2 s. |
| Request idle timeout | 150 s | 150 s | No — response arrives long before |
| Memory | 256 MB | 256 MB | No — SDK + one request is tiny |
| Function size | 20 MB (CLI-bundled) / 5 MB (server-bundled) | same | No |

- **Cold starts:** Edge Functions have a cold-start on first invocation after idle. The docs above
  don't publish a numeric cold-start figure; in practice it's a few hundred ms and is dominated by
  the Claude round-trip anyway, not a correctness concern for an on-demand button tap.
- **Request size:** the limits page does not document a maximum request-body size. Not a concern —
  the function sends only aggregate stats, a few hundred bytes.
- **Key takeaway:** the only limit worth internalizing is that the **2 s ceiling is CPU time, not
  wall-clock** — awaiting the LLM does not burn it. A single short call is comfortably within budget.

---

## 5. Recommendation + minimal working example

**Use the official `@anthropic-ai/sdk` via `npm:`.** Rationale for a first-time backend:
it is officially supported on Deno, `npm:` is Supabase's recommended import method, and the SDK
gives you typed responses, built-in retries (429/5xx), sane timeouts, and typed errors for free —
fewer moving parts than hand-rolling `fetch` + error handling. Reach for raw `fetch` (section 2)
only if you want zero dependencies; the mechanics are otherwise identical.

Minimal Edge Function (illustrates only the Deno↔Claude call + auth-gate + secret read; the storage
write and full prompt construction are left to the build spec):

```ts
// supabase/functions/ai-summary/index.ts
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // 1. Verify the Supabase auth token (server-side; rejects anonymous callers)
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    });
  }

  // 2. Read the aggregate stats the app sent (NO raw notes — see ADR 0006)
  const { stats } = await req.json();

  // 3. Call Claude Haiku 4.5 via the official SDK
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content:
          `Write a short, supportive 2-3 sentence reflective recap (not advice) ` +
          `based only on these aggregate stats: ${JSON.stringify(stats)}`,
      },
    ],
  });

  const summary = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  // 4. (Build spec) store `summary` + user.id + date, then return it
  return new Response(JSON.stringify({ summary }), {
    headers: { 'content-type': 'application/json' },
  });
});
```

### Sources

- Supabase Edge Functions — Secrets / env vars: https://supabase.com/docs/guides/functions/secrets
- Supabase Edge Functions — Limits (execution time, CPU, memory, size): https://supabase.com/docs/guides/functions/limits
- Supabase Edge Functions — Importing npm packages (`npm:` specifier, import maps): https://supabase.com/docs/guides/functions/import-maps
- Anthropic Messages API — endpoint, headers, request/response shape: https://platform.claude.com/docs/en/api/messages
- Anthropic `@anthropic-ai/sdk` (TypeScript) — runtime support incl. Deno: https://github.com/anthropics/anthropic-sdk-typescript
