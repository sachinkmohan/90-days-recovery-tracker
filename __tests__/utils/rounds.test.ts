import { getBackdateRange, getDayInRound, getDaysSinceLastRelapse, getRelapseCountForDate, getRelapseCountToday } from '@/utils/rounds';
import type { RelapseEvent, Round } from '@/types/timer';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-14T12:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function hoursAgo(n: number): string {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

describe('getDayInRound', () => {
  it('returns 1 on the day the round started', () => {
    expect(getDayInRound(daysAgo(0))).toBe(1);
  });

  it('returns 2 after one full day', () => {
    expect(getDayInRound(daysAgo(1))).toBe(2);
  });

  it('returns 47 after 46 days', () => {
    expect(getDayInRound(daysAgo(46))).toBe(47);
  });

  it('returns 90 after 89 days', () => {
    expect(getDayInRound(daysAgo(89))).toBe(90);
  });

  it('clamps to 90 when round has gone past 90 days', () => {
    expect(getDayInRound(daysAgo(100))).toBe(90);
  });

  it('returns 1 when startDate is in the future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(getDayInRound(future.toISOString())).toBe(1);
  });
});

describe('getDaysSinceLastRelapse', () => {
  it('returns null when there are no relapses', () => {
    expect(getDaysSinceLastRelapse([])).toBeNull();
  });

  it('returns 0 when the last relapse was today', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: hoursAgo(2), relapseCountThatDay: 1 },
    ];
    expect(getDaysSinceLastRelapse(relapses)).toBe(0);
  });

  it('returns 1 when the last relapse was yesterday', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(1), relapseCountThatDay: 1 },
    ];
    expect(getDaysSinceLastRelapse(relapses)).toBe(1);
  });

  it('returns the most recent relapse when there are multiple', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(5), relapseCountThatDay: 1 },
      { timestamp: daysAgo(2), relapseCountThatDay: 1 },
    ];
    expect(getDaysSinceLastRelapse(relapses)).toBe(2);
  });
});

describe('getRelapseCountToday', () => {
  it('returns 0 when there are no relapses', () => {
    expect(getRelapseCountToday([])).toBe(0);
  });

  it('returns 0 when all relapses were on previous days', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(1), relapseCountThatDay: 1 },
      { timestamp: daysAgo(3), relapseCountThatDay: 1 },
    ];
    expect(getRelapseCountToday(relapses)).toBe(0);
  });

  it('returns 1 when there is one relapse today', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: hoursAgo(2), relapseCountThatDay: 1 },
    ];
    expect(getRelapseCountToday(relapses)).toBe(1);
  });

  it('returns 3 when there are three relapses today', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: hoursAgo(5), relapseCountThatDay: 1 },
      { timestamp: hoursAgo(3), relapseCountThatDay: 2 },
      { timestamp: hoursAgo(1), relapseCountThatDay: 3 },
    ];
    expect(getRelapseCountToday(relapses)).toBe(3);
  });

  it('counts only today relapses when mixed with older ones', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(2), relapseCountThatDay: 1 },
      { timestamp: hoursAgo(4), relapseCountThatDay: 1 },
      { timestamp: hoursAgo(1), relapseCountThatDay: 2 },
    ];
    expect(getRelapseCountToday(relapses)).toBe(2);
  });
});

describe('getRelapseCountForDate', () => {
  it('returns 0 when there are no relapses', () => {
    expect(getRelapseCountForDate([], daysAgo(2))).toBe(0);
  });

  it('returns 0 when all relapses were on other days', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(1), relapseCountThatDay: 1 },
      { timestamp: daysAgo(3), relapseCountThatDay: 1 },
    ];
    expect(getRelapseCountForDate(relapses, daysAgo(2))).toBe(0);
  });

  it('counts relapses matching the target date, ignoring other days', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: daysAgo(2), relapseCountThatDay: 1 },
      { timestamp: daysAgo(1), relapseCountThatDay: 1 },
      { timestamp: daysAgo(2), relapseCountThatDay: 2 },
    ];
    expect(getRelapseCountForDate(relapses, daysAgo(2))).toBe(2);
  });

  it('matches the existing getRelapseCountToday result when the target date is today', () => {
    const relapses: RelapseEvent[] = [
      { timestamp: hoursAgo(5), relapseCountThatDay: 1 },
      { timestamp: hoursAgo(1), relapseCountThatDay: 2 },
      { timestamp: daysAgo(1), relapseCountThatDay: 1 },
    ];
    expect(getRelapseCountForDate(relapses, new Date())).toBe(getRelapseCountToday(relapses));
  });

  it('accepts a date string as well as a Date object', () => {
    const relapses: RelapseEvent[] = [{ timestamp: daysAgo(2), relapseCountThatDay: 1 }];
    const target = new Date(daysAgo(2));
    expect(getRelapseCountForDate(relapses, daysAgo(2))).toBe(
      getRelapseCountForDate(relapses, target)
    );
  });
});

describe('getBackdateRange', () => {
  function makeRound(startDate: string, relapses: RelapseEvent[] = []): Round {
    return { id: 'round-1', roundNumber: 1, startDate, endDate: null, relapses };
  }

  it('uses the round start date as min when there are no relapses yet', () => {
    const round = makeRound(daysAgo(10));
    const range = getBackdateRange(round);
    expect(range.min).toBe(round.startDate);
  });

  it('uses the latest relapse timestamp as min when relapses exist', () => {
    const round = makeRound(daysAgo(10), [
      { timestamp: daysAgo(5), relapseCountThatDay: 1 },
      { timestamp: daysAgo(2), relapseCountThatDay: 1 },
    ]);
    const range = getBackdateRange(round);
    expect(range.min).toBe(daysAgo(2));
  });

  it('max is always the current moment', () => {
    const round = makeRound(daysAgo(10));
    const range = getBackdateRange(round);
    expect(range.max).toBe(new Date().toISOString());
  });
});
