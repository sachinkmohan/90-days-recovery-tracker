import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  FEEDBACK_EMAIL,
  FEEDBACK_SUBJECT,
  feedbackFallbackMessage,
  openFeedbackMail,
} from '@/utils/feedback';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_NAME = '90 Days Recovery Tracker';

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

export default function SettingsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const border = useThemeColor({}, 'border');
  const icon = useThemeColor({}, 'icon');
  const secondary = useThemeColor({}, 'timerSecondary');
  const version = appVersion();

  const showFallback = () => {
    Alert.alert('Mail is unavailable', feedbackFallbackMessage(version, Platform.OS), [
      {
        text: 'Copy address',
        onPress: () => {
          void Clipboard.setStringAsync(FEEDBACK_EMAIL);
        },
      },
      {
        text: 'Copy subject',
        onPress: () => {
          void Clipboard.setStringAsync(FEEDBACK_SUBJECT);
        },
      },
      { text: 'OK', style: 'cancel' },
    ]);
  };

  const sendFeedback = async () => {
    const result = await openFeedbackMail(version, Platform.OS, Linking);
    if (result === 'unavailable') showFallback();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['bottom']}>
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send feedback"
          onPress={() => {
            void sendFeedback();
          }}
          style={[styles.row, { backgroundColor: cardBackground, borderColor: border }]}
        >
          <ThemedText type="defaultSemiBold">Send feedback</ThemedText>
          <IconSymbol name="chevron.right" size={20} color={icon} />
        </Pressable>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerName, { color: secondary }]}>{APP_NAME}</ThemedText>
          <ThemedText style={[styles.footerVersion, { color: secondary }]}>Version {version}</ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  footer: {
    marginTop: 28,
    alignItems: 'center',
    gap: 4,
  },
  footerName: {
    fontSize: 14,
  },
  footerVersion: {
    fontSize: 13,
  },
});
