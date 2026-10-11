// ADR 0006: version and platform only. Do not add round, relapse, mood, or check-in data.

export const FEEDBACK_EMAIL = 'hiscan98@gmail.com';

export const FEEDBACK_SUBJECT = '90 Days Recovery Tracker feedback';

export function feedbackPlatformLabel(os: string): string {
  switch (os) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    case 'web':
      return 'Web';
    default:
      return os;
  }
}

export function feedbackVersionLine(version: string, os: string): string {
  return `Version ${version} · ${feedbackPlatformLabel(os)}`;
}

export function buildFeedbackMailto(version: string, os: string): string {
  const body = `\n\n${feedbackVersionLine(version, os)}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function feedbackFallbackMessage(version: string, os: string): string {
  return `${FEEDBACK_EMAIL}\n${FEEDBACK_SUBJECT}\n${feedbackVersionLine(version, os)}`;
}

type FeedbackLinking = {
  canOpenURL: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<unknown>;
};

export async function openFeedbackMail(
  version: string,
  os: string,
  linking: FeedbackLinking,
): Promise<'opened' | 'unavailable'> {
  const url = buildFeedbackMailto(version, os);
  try {
    const canOpen = await linking.canOpenURL('mailto:');
    if (!canOpen) return 'unavailable';
    await linking.openURL(url);
    return 'opened';
  } catch {
    return 'unavailable';
  }
}
