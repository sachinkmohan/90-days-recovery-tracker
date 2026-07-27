import { ThemedText } from '@/components/themed-text';
import { useTimer } from '@/contexts/timer-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getRelapseMessage } from '@/utils/relapse-card';
import { getBackdateRange } from '@/utils/rounds';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Merge a time-of-day from one Date into the calendar date of another
function mergeDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), 0);
  return result;
}

function clampToRange(date: Date, min: Date, max: Date): Date {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RelapseModal() {
  const router = useRouter();
  const { relapseCountToday, currentRound, logRelapse } = useTimer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackdating, setIsBackdating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Android: show each picker as a modal one at a time
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const secondaryColor = useThemeColor({}, 'timerSecondary');
  const tint = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const range = useMemo(
    () => (currentRound ? getBackdateRange(currentRound) : null),
    [currentRound]
  );
  const minDate = range ? new Date(range.min) : undefined;
  const maxDate = range ? new Date(range.max) : undefined;

  const message = getRelapseMessage(relapseCountToday);

  const handleToggleBackdating = (value: boolean) => {
    setIsBackdating(value);
    if (value && minDate && maxDate) {
      setSelectedDate((prev) => clampToRange(prev, minDate, maxDate));
    }
  };

  const onDateChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date && minDate && maxDate) {
      setSelectedDate((prev) => clampToRange(mergeDateAndTime(date, prev), minDate, maxDate));
    }
  };

  const onTimeChange = (_: unknown, time?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (time && minDate && maxDate) {
      setSelectedDate((prev) => clampToRange(mergeDateAndTime(prev, time), minDate, maxDate));
    }
  };

  const handleLogRelapse = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await logRelapse(isBackdating ? selectedDate.toISOString() : undefined);
      router.dismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        {isBackdating ? (
          <ThemedText style={styles.message}>
            Logging a relapse for {formatDateTime(selectedDate)}
          </ThemedText>
        ) : (
          message !== null && (
            <ThemedText style={styles.message}>{message}</ThemedText>
          )
        )}

        <View style={styles.toggleRow}>
          <ThemedText style={styles.toggleLabel}>This happened earlier</ThemedText>
          <Switch value={isBackdating} onValueChange={handleToggleBackdating} />
        </View>

        {isBackdating && minDate && maxDate && (
          <View style={styles.pickerGroup}>
            <View style={[styles.pickerCard, { borderColor }]}>
              <ThemedText style={[styles.pickerLabel, { color: secondaryColor }]}>
                Date
              </ThemedText>
              {Platform.OS === 'android' && (
                <Pressable onPress={() => setShowDatePicker(true)}>
                  <ThemedText style={[styles.androidPickerValue, { color: tint }]}>
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </ThemedText>
                </Pressable>
              )}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  style={styles.picker}
                />
              )}
            </View>

            <View style={[styles.pickerCard, { borderColor }]}>
              <ThemedText style={[styles.pickerLabel, { color: secondaryColor }]}>
                Time
              </ThemedText>
              {Platform.OS === 'android' && (
                <Pressable onPress={() => setShowTimePicker(true)}>
                  <ThemedText style={[styles.androidPickerValue, { color: tint }]}>
                    {selectedDate.toLocaleTimeString(undefined, {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </ThemedText>
                </Pressable>
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                  style={styles.picker}
                />
              )}
            </View>
          </View>
        )}

        <Pressable
          style={[styles.button, { backgroundColor: tint, opacity: isSubmitting ? 0.6 : 1 }]}
          onPress={handleLogRelapse}
          disabled={isSubmitting}
        >
          <ThemedText style={styles.buttonText}>Log relapse</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.dismiss()} style={styles.cancelRow}>
          <ThemedText style={[styles.cancelText, { color: secondaryColor }]}>
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 24,
    padding: 28,
    borderRadius: 16,
    alignItems: 'center',
    gap: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  pickerGroup: {
    alignSelf: 'stretch',
    gap: 12,
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  picker: {
    width: '100%',
  },
  androidPickerValue: {
    fontSize: 17,
    fontWeight: '400',
    paddingVertical: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelRow: {
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 14,
  },
});
