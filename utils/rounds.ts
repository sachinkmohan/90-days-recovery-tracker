import { differenceInDays, isSameDay } from 'date-fns';
import type { RelapseEvent, Round } from '@/types/timer';

export function getDayInRound(startDate: string): number {
  const day = Math.max(differenceInDays(new Date(), new Date(startDate)) + 1, 1);
  return Math.min(day, 90);
}

function getLatestRelapse(relapses: RelapseEvent[]): RelapseEvent | null {
  if (relapses.length === 0) return null;
  return relapses.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
}

export function getDaysSinceLastRelapse(relapses: RelapseEvent[]): number | null {
  const latest = getLatestRelapse(relapses);
  if (!latest) return null;
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
  const latestRelapse = getLatestRelapse(round.relapses);

  const min =
    latestRelapse && new Date(latestRelapse.timestamp) > new Date(round.startDate)
      ? latestRelapse.timestamp
      : round.startDate;

  return { min, max: new Date().toISOString() };
}
