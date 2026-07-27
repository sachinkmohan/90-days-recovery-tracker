# Running the app on a physical device

Covers the two ways a phone connects to your local dev server (LAN mode, tunnel mode), why the app must run inside a **custom dev client** rather than the generic Expo Go app, and the specific failures we hit doing this for the first time (see Troubleshooting).

## Why this needs explaining

Getting a phone to load this app during development means answering two independent questions:

1. **Can the phone's network reach your laptop's Metro bundler at all?** — this is LAN mode vs. tunnel mode.
2. **Is the app on the phone even capable of running this project's code?** — this is Expo Go vs. custom dev client.

Both have to be right simultaneously. A wrong answer to either one produces the same generic symptom — "this site can't be reached" — which is what makes this confusing to debug.

## Diagram 1 — LAN mode

Phone and laptop talk directly, over the same Wi-Fi network. No third party involved.

```text
┌─────────────┐        same Wi-Fi router        ┌─────────────┐
│   Laptop    │ ───────────────────────────────► │    Phone    │
│ Metro :8081 │                                   │  Dev Client │
│             │ ◄─────────────────────────────── │             │
└─────────────┘     exp://192.168.x.x:8081        └─────────────┘
```

Fails when: phone and laptop are on different networks (Wi-Fi vs. cellular), the router isolates clients from each other (common on office/guest Wi-Fi), a VPN is active on either device, or a local firewall blocks inbound connections to Metro's port.

## Diagram 2 — Tunnel mode (ngrok)

`npx expo start --tunnel` starts a local `ngrok` client on your laptop, which opens an outbound connection to ngrok's public relay servers. The relay hands out a public `https://…exp.direct` URL. Your phone talks to that public URL over the open internet — it never needs to reach your laptop directly, so LAN restrictions and most firewalls stop mattering.

```text
┌─────────────┐                                    ┌─────────────┐
│   Laptop    │                                    │    Phone    │
│ Metro :8081 │                                    │  Dev Client │
└──────┬──────┘                                    └──────┬──────┘
       │ localhost                                        │
       ▼                                                   │ https://
┌─────────────────┐      public internet      ┌────────────┴────────┐
│  ngrok client    │ ─────────────────────────►│   ngrok relay        │
│  (runs on your   │◄───────────────────────── │   servers             │
│  laptop, spawned │                            │  (assigns the public │
│  by expo start)  │                            │   exp.direct URL)     │
└─────────────────┘                            └───────────────────────┘
```

Trade-off: an extra network hop (laptop → internet → back to phone) means slightly higher latency than LAN mode, and it depends on ngrok's service being reachable — but it sidesteps almost every local-network misconfiguration.

## Diagram 3 — Expo Go vs. custom dev client

Scanning a QR code or opening a URL only works if the *app that opens it* understands this project's native code. There are two different apps this could be:

```text
                  scans QR code / opens URL
        Phone  ───────────────────────────────►  which app receives it?

┌────────────────────────┐              ┌─────────────────────────────┐
│        Expo Go          │              │      Custom Dev Client       │
│  generic sandbox app,    │              │   built FROM this project's  │
│  downloaded from the     │              │   own native code            │
│  App Store / Play Store  │              │   (the ios/ and android/      │
│                          │              │    directories in this repo) │
│  ✅ works only if the app │              │                              │
│     has NO extra native  │              │  ✅ always works for THIS app │
│     modules              │              │     — it already contains    │
│                          │              │     every native module it   │
│  ❌ this project has      │              │     needs                    │
│     `expo-dev-client`     │              │                              │
│     installed and native │              │  Built once via:              │
│     ios/android folders  │              │    npx expo run:ios --device │
│     → Expo Go rejects it  │              │    npx expo run:android      │
└────────────────────────┘              └─────────────────────────────┘
```

## This project's setup

- `expo-dev-client` is a dependency (see `package.json`), and `ios/`/`android/` native project folders exist in this repo — both are signals that this app needs a **custom dev client**, not Expo Go.
- `app.json`'s `scheme` is `ninetydaysrecovery` — this is the URI scheme the custom dev client registers, used when deep-linking into it manually.
- The dev client is a real, installable app. Once built and installed on a phone (via cable, see below), it stays installed — you only rebuild it when native dependencies change, not on every `expo start`.

## Step-by-step

### Building and installing the dev client (one-time, or after native dependency changes)

With the phone connected via USB (and, for iOS, trusted/paired with Xcode):

```bash
npx expo run:ios --device      # iOS
npx expo run:android           # Android
```

This compiles the native app and installs it directly on the connected phone.

### Day-to-day: connecting to the dev server

**LAN mode** (phone and laptop on the same Wi-Fi, no VPN, no client-isolated network):

```bash
npx expo start
```

Scan the QR code, or open the printed `exp://192.168.x.x:8081` URL, from inside the **dev client app** (not Expo Go).

**Tunnel mode** (LAN mode fails, or networks differ):

```bash
npx expo start --tunnel
```

The terminal UI prints a QR code and a public URL like `https://xxxxx.exp.direct`. Scan it, or enter that URL manually in the dev client's "Enter URL manually" field.

## Troubleshooting

**1. Expo Go shows "this site can't be reached," tunnel/LAN mode doesn't matter.**
Wrong app entirely. This project requires the custom dev client built via `expo run:ios`/`expo run:android` (see above) — Expo Go cannot load an app with native modules it doesn't ship with. Confirm by checking for `expo-dev-client` in `package.json` and the presence of `ios/`/`android/` folders.

**2. Same Wi-Fi network, LAN mode still fails.**
Some networks (office/guest Wi-Fi, some home routers, most VPNs) block devices from seeing each other even on the same SSID. Switch to tunnel mode: `npx expo start --tunnel`.

**3. `--tunnel` errors or hangs on first run.**
Expo's tunnel mode needs the `@expo/ngrok` **npm package**, not the standalone `ngrok` CLI (having `ngrok` installed globally via Homebrew, configured with an auth token, does not satisfy this — they're separate installs). Expo prompts to auto-install it the first time; accept the prompt, or run `npx expo install @expo/ngrok` manually.

**4. Tunnel mode starts, but no QR code or URL is printed.**
Expo's connection banner is drawn by an interactive terminal UI — it only renders when stdout is a real TTY. If `expo start` is run through `CI=1`, in a non-interactive shell, or with output piped/redirected, the banner never appears (and pressing `c` does nothing, since there's no interactive session to respond to). Run it directly in a normal terminal app (Terminal.app, iTerm) with `CI` unset (`echo $CI` should print nothing) to get the banner. As a fallback, the tunnel URL can always be read directly from ngrok's local API while `expo start --tunnel` is running:

```bash
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https:[^"]*"'
```
