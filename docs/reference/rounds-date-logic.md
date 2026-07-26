# `utils/rounds.ts` — date & timezone logic

Covers `getRelapseCountForDate`, `getRelapseCountToday`, and `getBackdateRange` — the functions that determine which calendar day a `Relapse` counts against, and the valid range for backdating one. Related: ADR 0005 — Backdated relapse ordering.

## The core model: a `Date` is one instant

A JavaScript `Date` doesn't store "a local time" — it stores a single number, milliseconds since the Unix epoch (UTC). That number is absolute; it means the same instant everywhere. Two parallel families of getters read it back out:

| Local (device timezone) | UTC (always the same) |
|---|---|
| `getDate()` | `getUTCDate()` |
| `getFullYear()` | `getUTCFullYear()` |

`isSameDay` (from `date-fns`), which `getRelapseCountForDate` relies on, uses the **local** getters. So "same day" means "same day on the device viewing the data," not "same day in UTC."

## `getRelapseCountForDate(relapses, date)`

```ts
export function getRelapseCountForDate(relapses: RelapseEvent[], date: Date | string): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  return relapses.filter((r) => isSameDay(new Date(r.timestamp), target)).length;
}
```

Counts how many relapses fall on the same local calendar day as `date`. Worked example for a user in Berlin (CEST, UTC+2):

| `r.timestamp` (UTC) | Local time (CEST) | Local calendar day |
|---|---|---|
| `2026-07-22T09:00:00Z` | Jul 22, 11:00 | **Jul 22** |
| `2026-07-22T23:30:00Z` | Jul 23, 01:30 | **Jul 23** |
| `2026-07-23T00:15:00Z` | Jul 23, 02:15 | **Jul 23** |

```ts
getRelapseCountForDate(relapses, 'Jul 22') // → 1 (only the first row)
getRelapseCountForDate(relapses, 'Jul 23') // → 2 (rows 2 and 3)
```

Note that rows 2 and 3 look far apart as raw UTC date strings but land on the same local day, while row 1 shares its UTC date string with row 2 but lands on a *different* local day. The UTC string alone is not a reliable guide to which day a relapse belongs to — only the local calendar day is.

## `getRelapseCountToday(relapses)`

A thin wrapper: `getRelapseCountForDate(relapses, new Date())`. Behavior is unchanged from before the ticket-15 refactor — this is what `relapse-modal.tsx`'s real-time "log now" flow and `getRelapseMessage` depend on, so it had to keep working identically.

## `getBackdateRange(round)`

```ts
export function getBackdateRange(round: Round): { min: string; max: string } {
  const latestRelapse =
    round.relapses.length > 0
      ? round.relapses.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b))
      : null;

  const min =
    latestRelapse && new Date(latestRelapse.timestamp) > new Date(round.startDate)
      ? latestRelapse.timestamp
      : round.startDate;

  return { min, max: new Date().toISOString() };
}
```

Computes the valid picker range for backdating a relapse, per ADR 0005: never before the round started, and never before an existing relapse (so `relapses` stays permanently in chronological order — no entry ever needs its `relapseCountThatDay` recomputed when a new one is inserted).

**Input**: the whole `Round` object — `getBackdateRange` only reads `round.startDate` and `round.relapses` from it, but the function signature takes the full `Round`, not just those two fields.

**Output**: a plain object, `{ min: string; max: string }` — both ISO timestamp strings, not `Date` objects. `min` is the earliest pickable timestamp, `max` is the latest (always "now").

### Example 1 — no relapses yet

Input:

```ts
const round: Round = {
  id: 'round-1',
  roundNumber: 1,
  startDate: '2026-07-20T08:00:00.000Z',
  endDate: null,
  relapses: [],
};
```

Output (assuming "now" is `2026-07-25T10:00:00.000Z`):

```ts
getBackdateRange(round)
// → { min: '2026-07-20T08:00:00.000Z', max: '2026-07-25T10:00:00.000Z' }
```

`relapses` is empty, so `latestRelapse` is `null` and `min` falls back to `round.startDate`. Pickable range: `Jul 20` → now.

### Example 2 — relapses already logged

Input:

```ts
const round: Round = {
  id: 'round-1',
  roundNumber: 1,
  startDate: '2026-07-20T08:00:00.000Z',
  endDate: null,
  relapses: [
    { timestamp: '2026-07-22T09:00:00.000Z', relapseCountThatDay: 1 },
    { timestamp: '2026-07-24T14:00:00.000Z', relapseCountThatDay: 1 },
  ],
};
```

Output (same "now"):

```ts
getBackdateRange(round)
// → { min: '2026-07-24T14:00:00.000Z', max: '2026-07-25T10:00:00.000Z' }
```

`latestRelapse` is the `Jul 24 14:00` entry. Since that's later than `round.startDate`, `min` becomes `Jul 24 14:00` instead of `Jul 20`. `Jul 23` is *not* pickable — it would insert a relapse before one that's already logged.

#### Line-by-line walkthrough, using Example 2's data

```ts
export function getBackdateRange(round: Round): { min: string; max: string } {
  const latestRelapse =
    round.relapses.length > 0
      ? round.relapses.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b))
      : null;

  const min =
    latestRelapse && new Date(latestRelapse.timestamp) > new Date(round.startDate)
      ? latestRelapse.timestamp
      : round.startDate;

  return { min, max: new Date().toISOString() };
}
```

**`latestRelapse`**: `round.relapses.length` is `2`, so the condition is truthy and the `reduce` runs (see the `reduce` walkthrough below). It returns the entry with the latest timestamp: `{ timestamp: '2026-07-24T14:00:00.000Z', relapseCountThatDay: 1 }`. So `latestRelapse` is that `Jul 24` object — not `null`.

**`min`**: the condition is `latestRelapse && new Date(latestRelapse.timestamp) > new Date(round.startDate)` — two checks joined by `&&`. (1) Is `latestRelapse` truthy? Yes. (2) Is `Jul 24 14:00 > Jul 20`? Yes. Both true, so the ternary's condition is `true`, and `min = latestRelapse.timestamp` = `'2026-07-24T14:00:00.000Z'`. If `relapses` were empty, `latestRelapse` would be `null`, the `&&` would short-circuit to `false` before even comparing dates, and `min` would fall back to `round.startDate` — this is exactly Example 1.

**Return**: `{ min, max: new Date().toISOString() }` builds the output object. `min` is whatever was just computed above. `max` is simply "right now" — computed fresh on every call, never derived from `round` at all.

Final result: `{ min: '2026-07-24T14:00:00.000Z', max: '2026-07-25T10:00:00.000Z' }` — matching the Output block above.

#### How the `reduce` picks the latest relapse

```ts
round.relapses.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b))
```

`reduce` walks the array left to right, carrying forward a single "winner so far" (`a`) and comparing it against the next element (`b`). No initial value is passed, so `a` starts out as `relapses[0]` itself, and comparison begins from `relapses[1]`.

With this example's two relapses — `[Jul 22 09:00, Jul 24 14:00]` — there's only one comparison to make:

| Step | `a` (winner so far) | `b` (next element) | `a.timestamp > b.timestamp`? | Result (becomes next `a`) |
|---|---|---|---|---|
| 1 | `Jul 22 09:00` | `Jul 24 14:00` | No — `Jul 22` is earlier | `Jul 24 14:00` |

#### Simpler example: finding the max of 5 numbers

Same shape of `reduce`, stripped down to plain numbers instead of relapse timestamps — this is the pattern to build intuition on before mapping it back to dates:

```ts
[3, 7, 2, 9, 5].reduce((a, b) => (a > b ? a : b))
```

`n = 5` elements means `n - 1 = 4` comparisons. `a` starts as `3` (the first element); each step compares the current winner against the next element in the array.

The ternary `a > b ? a : b` never modifies `a` or `b` — it just picks one of the two existing values and returns it. If `a > b` is `true`, the expression evaluates to `a`; if it's `false` (i.e. `a < b`, or they're equal), it evaluates to `b`. Whichever value comes out becomes the `a` for the *next* step — `reduce` is just asking the callback "who wins?" at each step and carrying the answer forward:

| Step | `a` (winner so far) | `b` (next element) | `a > b`? | Result (becomes next `a`) |
|---|---|---|---|---|
| 1 | `3` | `7` | No — `3` is smaller | `7` |
| 2 | `7` | `2` | Yes — `7` is bigger | `7` |
| 3 | `7` | `9` | No — `7` is smaller | `9` |
| 4 | `9` | `5` | Yes — `9` is bigger | `9` |

Final result: **`9`**. Notice `b` is always just "the next element in the array, in order" — it's never the previous winner. Only `a` carries state forward between steps; `b` is a fresh value from the array each time. Once you can trace this table for five plain numbers, the relapse-timestamp version above is the exact same mechanism with `new Date(x.timestamp) > new Date(y.timestamp)` standing in for `a > b`, and whole objects (`RelapseEvent`s) being carried instead of numbers.

#### Why step 2's `a` isn't "the same `a`" as step 1's

The table above can look like `a` is one variable being mutated in place across steps. It isn't. `reduce` keeps its own internal accumulator, separate from the callback's parameters, and the callback runs fresh each time with new arguments. Tracing step 1 → step 2:

1. `reduce` starts with accumulator `= 3` (the array's first element).
2. It calls the callback with `a = 3` (the accumulator) and `b = 7` (the array's next element).
3. Inside the callback, `3 > 7` is `false`, so the ternary evaluates to `b`, which is `7`.
4. `reduce` takes that **returned value** and overwrites its internal accumulator with it: accumulator `= 7`.
5. For the *next* call, `reduce` passes the current accumulator in as `a`. So step 2 gets `a = 7` — not because step 1's `a` changed, but because `reduce` handed in the new accumulator, which happens to equal what `b` was in step 1.

So each row's `a` is really "the accumulator going into this step," and each row's "Result" is "the accumulator coming out" — which is what shows up as the next row's `a`. `a` and `b` themselves are never mutated; only the accumulator `reduce` holds between calls changes, and it does so by being replaced, not edited.

Only one comparison happens because there are only two elements; `reduce` needs `n - 1` comparisons for `n` elements. Whatever wins the last comparison is the array's final value — here, `Jul 24 14:00`. With a third relapse, that winner would become the new `a` and get compared against the third element in a second step, and so on — the "latest so far" is carried forward one element at a time until the array is exhausted.

## Workflow: from `timer-context.tsx` to `rounds.ts`

`utils/rounds.ts` has no side effects and never runs on its own — it's called from `contexts/timer-context.tsx`, which owns all app state (`currentRound`, `allRounds`) and the `useTimer()` hook every screen reads from. Two separate, independent paths call into it.

### Path 1 — every render, read-only ("what's today's count?")

```
┌─────────────────────┐
│  Any screen renders  │   e.g. checkin-card.tsx reading useTimer()
└──────────┬───────────┘
           │ React re-renders TimerProvider
           ▼
┌─────────────────────────────────────┐
│ timer-context.tsx (component body)  │
│   relapses = currentRound.relapses  │
│   getRelapseCountToday(relapses)  ──┼──┐
└─────────────────────────────────────┘  │
                                          ▼
                          ┌───────────────────────────────┐
                          │ rounds.ts                     │
                          │ getRelapseCountToday(relapses)│
                          │   → getRelapseCountForDate(    │
                          │       relapses, new Date())   │
                          └───────────────┬───────────────┘
                                          │ returns a number
                                          ▼
                          relapseCountToday exposed via useTimer()
```

Nothing is stored — `relapseCountToday` is recalculated from `currentRound.relapses` on every render. It can never go stale because it's never cached.

### Path 2 — user action ("log a relapse")

```
┌───────────────────────────┐
│ User taps "Log a relapse" │   (relapse-modal.tsx)
└─────────────┬─────────────┘
              │ calls
              ▼
┌────────────────────────────────────────────────────┐
│ timer-context.tsx: logRelapse(timestamp?)           │
│                                                      │
│  1. targetTimestamp = timestamp ?? new Date().toISOString()
│  2. countForDate = getRelapseCountForDate(  ────────┼──┐
│       currentRound.relapses, targetTimestamp)       │  │
└──────────────────────────────────────────────────────┘  │
                                                           ▼
                                        ┌──────────────────────────────┐
                                        │ rounds.ts                     │
                                        │ getRelapseCountForDate(        │
                                        │   relapses, target)           │
                                        │  → counts same-local-day       │
                                        │    relapses already on record │
                                        └───────────────┬───────────────┘
                                                        │ returns a number
              ┌─────────────────────────────────────────┘
              ▼
┌────────────────────────────────────────────────────┐
│ timer-context.tsx (continued)                       │
│  3. event = { timestamp: targetTimestamp,           │
│               relapseCountThatDay: countForDate + 1 }│
│  4. await StorageService.saveRelapse(id, event)  ───┼──► AsyncStorage (persisted first)
│  5. setCurrentRound(prev => append event)           │
│       also mirrors into setAllRounds                │
└──────────────────────────┬───────────────────────────┘
                           │ state changed → React re-renders
                           ▼
                 Path 1 runs again automatically —
                 relapseCountToday now reflects the new relapse
```

Key point: `rounds.ts` functions are pure — they take arrays/dates in, return numbers/objects out, and touch nothing else. `timer-context.tsx` is what decides *when* to call them (every render vs. on a button tap) and *what to do* with the result (expose it vs. persist it and update state).

### Where `getBackdateRange` fits (not wired up yet)

```
┌───────────────────────────┐
│ relapse-modal.tsx (future,│   ticket #16 — blocked on #15, not built yet
│ backdated entry UI)       │
└─────────────┬─────────────┘
              │ calls
              ▼
┌────────────────────────────────────┐        ┌───────────────────────────┐
│ rounds.ts: getBackdateRange(round) │──────► │ { min, max } bounds       │
└────────────────────────────────────┘        │ passed to native picker   │
                                               └─────────────┬─────────────┘
                                                             │ user picks a date
                                                             ▼
                                         logRelapse(pickedDate.toISOString())
                                         — re-enters Path 2 above, with a
                                         real timestamp instead of undefined
```

`getBackdateRange` exists and is fully tested today, but nothing calls it yet — `timer-context.tsx` doesn't import it. It's the piece ticket #16 will use to constrain the picker before handing a chosen date to the same `logRelapse` already in place.

## Why local-time dependence is correct here, not a bug

This is a personal daily habit tracker — "today" should mean the user's today, wherever their phone is, not UTC's today. The edge case worth knowing: a user who changes timezones (e.g. travels) between logging relapses will see older entries' "day" recomputed relative to wherever the phone is *now* when displayed, not where it was when logged. That's a pre-existing, app-wide property (check-ins and history rendering group by local calendar day the same way) — not something introduced by this logic, and not in scope to fix here.

## Further reading

For the underlying JS `Date`/timezone model in more depth, with a quiz, see Lesson 1 in the `javascript/dates-timezones` topic of the personal `fullstack-dev` learning workspace *(a separate repo — not linked here since a cross-repo relative path wouldn't resolve outside this machine)*.
