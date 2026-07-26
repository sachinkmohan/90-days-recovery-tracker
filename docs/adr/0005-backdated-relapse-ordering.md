# Backdated relapse logging is append-only, ordering-preserving

We're adding the ability to log a relapse retroactively (e.g., "two days ago at 2pm") rather than only in the moment. Instead of allowing an arbitrary past date and resequencing the `relapses` array afterward, we constrain the pickable range to `[max(round.startDate, lastRelapseTimestamp), now]` — a new relapse can never be dated before an existing one in the same round.

We chose this over free-form backdating with resort/resequencing because it keeps `relapses` permanently in chronological (append) order, so `relapseCountThatDay`, streak calculations, and calendar/history rendering never need to recompute past entries when a new one is inserted — only the new entry is ever touched.
