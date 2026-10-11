import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { CheckInCard } from '@/components/timer/checkin-card';
import { ProgressBar } from '@/components/timer/progress-bar';
import { RelapseCard } from '@/components/timer/relapse-card';
import { useTimer } from '@/contexts/timer-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TimerScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const secondary = useThemeColor({}, 'timerSecondary');
  const celebration = useThemeColor({}, 'celebration');
  const icon = useThemeColor({}, 'icon');
  const {
    currentRound,
    roundNumber,
    dayInRound,
    daysSinceLastRelapse,
    lastRelapseTimestamp,
    todayCheckIn,
    isLoading,
    finishRound,
    startNewRound,
  } = useTimer();

  // Redirect to onboarding if not yet started
  useEffect(() => {
    if (!isLoading && !currentRound) {
      router.replace('/onboarding');
    }
  }, [isLoading, currentRound, router]);

  // Navigate to round summary when day 90 is reached.
  // redirectedToSummary prevents a loop when the user taps "Maybe later".
  // Resets whenever the active round changes so detection works for each new round.
  const [redirectedToSummary, setRedirectedToSummary] = useState(false);
  const lastRoundIdRef = useRef(currentRound?.id);

  useEffect(() => {
    if (currentRound?.id !== lastRoundIdRef.current) {
      lastRoundIdRef.current = currentRound?.id;
      setRedirectedToSummary(false);
      return;
    }
    if (!isLoading && currentRound && dayInRound >= 90 && !currentRound.endDate && !redirectedToSummary) {
      setRedirectedToSummary(true);
      router.push('/round-summary');
    }
  }, [isLoading, currentRound, dayInRound, router, redirectedToSummary]);

  const isStartingNextRound = useRef(false);
  const handleStartNextRound = async () => {
    if (isStartingNextRound.current) return;
    isStartingNextRound.current = true;
    try {
      await finishRound();
      await startNewRound();
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to start next round', e);
    } finally {
      isStartingNextRound.current = false;
    }
  };

  const handleLogRelapse = () => {
    router.push('/relapse-modal');
  };

  const handleCheckIn = () => {
    router.push('/check-in-modal');
  };

  const openSettings = () => {
    router.push('/settings');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentRound) {
    return null;
  }

  if (dayInRound >= 90 && !currentRound.endDate && redirectedToSummary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.gearRow}>
          <SettingsGear color={icon} onPress={openSettings} />
        </View>
        <View style={styles.roundCompleteContainer}>
          <ThemedText style={[styles.roundCompleteTitle, { color: celebration }]}>
            Round complete!
          </ThemedText>
          <Pressable style={[styles.startButton, { backgroundColor: tint }]} onPress={handleStartNextRound}>
            <ThemedText style={styles.startButtonText}>
              Start Round {roundNumber + 1}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/round-summary')} style={styles.notYetRow}>
            <ThemedText style={[styles.notYetText, { color: secondary }]}>Not yet</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top']}>
      <View style={styles.gearRow}>
        <SettingsGear color={icon} onPress={openSettings} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <ThemedText style={styles.heroNumber}>Day {dayInRound}</ThemedText>
          <ThemedText style={styles.heroSub}>of 90</ThemedText>
        </View>

        <ProgressBar dayInRound={dayInRound} />

        <RelapseCard
          lastRelapseTimestamp={lastRelapseTimestamp}
          daysSinceLastRelapse={daysSinceLastRelapse}
          onLogRelapse={handleLogRelapse}
        />

        <CheckInCard todayCheckIn={todayCheckIn} onCheckIn={handleCheckIn} />

        <CalendarGrid
          startDate={new Date(currentRound.startDate)}
          relapses={currentRound.relapses}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGear({ color, onPress }: { color: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Settings"
      onPress={onPress}
      hitSlop={8}
      style={styles.gearButton}
    >
      <IconSymbol name="gearshape.fill" size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gearRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  gearButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  heroNumber: {
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 80,
    fontVariant: ['tabular-nums'],
  },
  heroSub: {
    fontSize: 20,
    opacity: 0.5,
    marginTop: -4,
  },
  roundCompleteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  roundCompleteTitle: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  startButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  notYetRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  notYetText: {
    fontSize: 14,
  },
});
