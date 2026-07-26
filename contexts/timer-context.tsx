import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { StorageService } from '@/services/storage';
import { DevStorageService } from '@/services/dev-storage';
import { NotificationService } from '@/services/notification-service';
import { getDayInRound, getDaysSinceLastRelapse, getRelapseCountForDate, getRelapseCountToday } from '@/utils/rounds';
import { MILESTONES, type MilestoneDays } from '@/utils/notifications';
import { shouldSkipOnboarding } from '@/utils/onboarding';
import { isSameDay } from 'date-fns';
import type { Round, CheckInEntry } from '@/types/timer';
import type { NotificationPreset } from '@/utils/notifications';

interface TimerContextValue {
  // Round state
  allRounds: Round[];
  currentRound: Round | null;
  roundNumber: number;
  dayInRound: number;
  daysSinceLastRelapse: number | null;
  lastRelapseTimestamp: string | null;
  relapseCountToday: number;
  // Check-in state
  checkIns: CheckInEntry[];
  todayCheckIn: CheckInEntry | null;
  // App state
  isLoading: boolean;
  // Dev mode state
  isDevMode: boolean;
  devStartDate: Date | null;
  // Actions
  completeOnboarding: (chosenDate: Date, notificationPreset?: NotificationPreset) => Promise<void>;
  logRelapse: (timestamp?: string) => Promise<void>;
  finishRound: () => Promise<void>;
  startNewRound: () => Promise<void>;
  saveCheckIn: (entry: CheckInEntry) => Promise<void>;
  // Dev mode actions
  enterDevMode: (devDate: Date) => Promise<void>;
  exitDevMode: () => Promise<void>;
  setDevStartDate: (date: Date) => Promise<void>;
  devSeedRelapses: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [allRounds, setAllRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dev mode state
  const [isDevMode, setIsDevMode] = useState(false);
  const [devStartDate, setDevStartDateState] = useState<Date | null>(null);
  const [realRound, setRealRound] = useState<Round | null>(null);

  const effectiveRound = isDevMode
    ? currentRound
      ? { ...currentRound, startDate: devStartDate?.toISOString() ?? currentRound.startDate }
      : null
    : currentRound;

  // Derived values
  const dayInRound = effectiveRound ? getDayInRound(effectiveRound.startDate) : 1;
  const relapses = effectiveRound?.relapses ?? [];
  const daysSinceLastRelapse = getDaysSinceLastRelapse(relapses);
  const relapseCountToday = getRelapseCountToday(relapses);
  const lastRelapseTimestamp = relapses.length > 0
    ? relapses.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b).timestamp
    : null;
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIn = checkIns.find((c) => c.date === today) ?? null;

  useEffect(() => {
    async function initialize() {
      setIsLoading(true);

      // Wipe old data model on first load (no real users yet)
      const rounds = await StorageService.getRounds();
      if (rounds.length === 0) {
        await StorageService.clearAllData();
      }

      const freshRounds = await StorageService.getRounds();
      const activeRound = freshRounds.findLast((r) => r.endDate === null) ?? null;
      setAllRounds(freshRounds);
      setCurrentRound(activeRound);

      const storedCheckIns = await StorageService.getCheckIns();
      setCheckIns(storedCheckIns);

      // Check for milestone notifications on app open — iterate all thresholds
      // so milestones crossed while the app was closed are not missed.
      if (activeRound) {
        const relapses = activeRound.relapses;
        const days = getDaysSinceLastRelapse(relapses);
        if (days !== null) {
          const lastRelapse = relapses.length > 0
            ? relapses.reduce((a, b) => new Date(a.timestamp) > new Date(b.timestamp) ? a : b).timestamp
            : activeRound.startDate;
          const notified = await StorageService.getNotifiedMilestones(activeRound.id, lastRelapse);
          for (const milestone of MILESTONES) {
            if (days >= milestone && !notified.includes(milestone)) {
              const fired = await NotificationService.fireMilestoneNotification(milestone as MilestoneDays);
              if (fired) {
                await StorageService.saveNotifiedMilestone(activeRound.id, lastRelapse, milestone);
              }
            }
          }
        }

        const preset = await StorageService.getNotificationPreset();
        if (preset) {
          await NotificationService.scheduleDailyNotifications(preset, activeRound.startDate);
        }
      }

      const devModeState = await DevStorageService.getDevMode();
      if (devModeState?.isActive) {
        setIsDevMode(true);
        setDevStartDateState(new Date(devModeState.devStartDate));
        setRealRound(activeRound);
      }

      setIsLoading(false);
    }

    initialize();
  }, []);

  const completeOnboarding = useCallback(async (chosenDate: Date, notificationPreset?: NotificationPreset) => {
    if (await shouldSkipOnboarding(null, StorageService.hasCompletedOnboarding)) return;

    await StorageService.clearAllData();

    const round = await StorageService.createRoundWithDate(chosenDate.toISOString());
    await StorageService.markOnboardingComplete();
    setAllRounds([round]);
    setCurrentRound(round);

    if (notificationPreset) {
      await StorageService.saveNotificationPreset(notificationPreset);
      await NotificationService.scheduleDailyNotifications(notificationPreset, round.startDate);
    }
  }, []);

  const logRelapse = useCallback(async (timestamp?: string) => {
    if (!currentRound) return;
    const targetTimestamp = timestamp ?? new Date().toISOString();
    const countForDate = getRelapseCountForDate(currentRound.relapses, targetTimestamp);
    const event = {
      timestamp: targetTimestamp,
      relapseCountThatDay: countForDate + 1,
    };
    await StorageService.saveRelapse(currentRound.id, event);
    setCurrentRound((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, relapses: [...prev.relapses, event] };
      setAllRounds((rounds) =>
        rounds.map((r) => (r.id === updated.id ? updated : r))
      );
      return updated;
    });
  }, [currentRound]);

  const finishRound = useCallback(async () => {
    if (!currentRound) return;
    const endDate = new Date().toISOString();
    await StorageService.completeRound(currentRound.id, endDate);
    setCurrentRound((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, endDate };
      setAllRounds((rounds) =>
        rounds.map((r) => (r.id === updated.id ? updated : r))
      );
      return updated;
    });
  }, [currentRound]);

  const startNewRound = useCallback(async () => {
    const round = await StorageService.startNewRound();
    setAllRounds((prev) => [...prev, round]);
    setCurrentRound(round);

    // Always exit dev mode when a new round begins — the new round uses today
    // as its real startDate, so keeping devStartDate would make dayInRound ≥ 90
    // immediately and re-trigger the round summary on the home screen.
    if (isDevMode) {
      setIsDevMode(false);
      setDevStartDateState(null);
      setRealRound(null);
      await DevStorageService.clearDevMode();
    }

    const preset = await StorageService.getNotificationPreset();
    if (preset) {
      await NotificationService.scheduleDailyNotifications(preset, round.startDate);
    }
  }, [isDevMode]);

  const saveCheckIn = useCallback(async (entry: CheckInEntry) => {
    await StorageService.saveCheckIn(entry);
    setCheckIns((prev) => {
      const idx = prev.findIndex((c) => c.date === entry.date);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  // Dev mode actions
  const enterDevMode = useCallback(async (devDate: Date) => {
    setRealRound(currentRound);
    setDevStartDateState(devDate);
    setIsDevMode(true);
    await DevStorageService.setDevMode({
      isActive: true,
      devStartDate: devDate.toISOString(),
      activatedAt: new Date().toISOString(),
    });
  }, [currentRound]);

  const exitDevMode = useCallback(async () => {
    setCurrentRound(realRound);
    setIsDevMode(false);
    setDevStartDateState(null);
    setRealRound(null);
    await DevStorageService.clearDevMode();
  }, [realRound]);

  const devSeedRelapses = useCallback(async () => {
    if (!currentRound) return;
    const start = new Date(currentRound.startDate);
    const testRelapses = [5, 12, 35].map((daysOffset) => {
      const d = new Date(start);
      d.setDate(d.getDate() + daysOffset);
      d.setSeconds(d.getSeconds() + Math.floor(Math.random() * 3600)); // unique timestamp
      return { timestamp: d.toISOString(), relapseCountThatDay: 1 };
    });
    for (const event of testRelapses) {
      await StorageService.saveRelapse(currentRound.id, event);
    }
    setCurrentRound((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, relapses: [...prev.relapses, ...testRelapses] };
      setAllRounds((rounds) =>
        rounds.map((r) => (r.id === updated.id ? updated : r))
      );
      return updated;
    });
  }, [currentRound]);

  const setDevStartDate = useCallback(async (date: Date) => {
    setDevStartDateState(date);
    await DevStorageService.setDevMode({
      isActive: true,
      devStartDate: date.toISOString(),
      activatedAt: new Date().toISOString(),
    });
  }, []);

  return (
    <TimerContext.Provider
      value={{
        allRounds,
        currentRound,
        roundNumber: currentRound?.roundNumber ?? 1,
        dayInRound,
        daysSinceLastRelapse,
        lastRelapseTimestamp,
        relapseCountToday,
        checkIns,
        todayCheckIn,
        isLoading,
        isDevMode,
        devStartDate,
        completeOnboarding,
        logRelapse,
        finishRound,
        startNewRound,
        saveCheckIn,
        enterDevMode,
        exitDevMode,
        setDevStartDate,
        devSeedRelapses,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
