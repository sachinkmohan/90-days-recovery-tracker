import { differenceInDays, isSameDay } from 'date-fns';
import type { RelapseEvent, Round } from '@/types/timer';

export function getDayInRound(startDate: string): number {
  const day = Math.max(differenceInDays(new Date(), new Date(startDate)) + 1, 1);
  return Math.min(day, 90);
}

export function getDaysSinceLastRelapse(relapses: RelapseEvent[]): number | null {
  if (relapses.length === 0) return null;
  const latest = relapses.reduce((a, b) =>
    new Date(a.timestamp) > new Date(b.timestamp) ? a : b
  );
  return differenceInDays(new Date(), new Date(latest.timestamp));
}

export function getRelapseCountForDate(relapses: RelapseEvent[], date: Date | string): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  return relapses.filter((r) => isSameDay(new Date(r.timestamp), target)).length;
}

export function getRelapseCountToday(relapses: RelapseEvent[]): number {
  return getRelapseCountForDate(relapses, new Date());
}

// Valid range for backdating a relapse: never before the round started, and
// never before an existing relapse — this keeps `relapses` permanently in
// chronological order so no entry ever needs its `relapseCountThatDay`
// recomputed when a new one is inserted. See ADR 0005.
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
