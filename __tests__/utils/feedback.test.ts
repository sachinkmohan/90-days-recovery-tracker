import {
  FEEDBACK_EMAIL,
  FEEDBACK_SUBJECT,
  buildFeedbackMailto,
  feedbackFallbackMessage,
  feedbackPlatformLabel,
  feedbackVersionLine,
  openFeedbackMail,
} from '@/utils/feedback';

describe('feedback mail handoff', () => {
  it('labels the three platforms', () => {
    expect(feedbackPlatformLabel('ios')).toBe('iOS');
    expect(feedbackPlatformLabel('android')).toBe('Android');
    expect(feedbackPlatformLabel('web')).toBe('Web');
  });

  it('builds a mailto with the subject and a version line under a blank body', () => {
    const url = buildFeedbackMailto('1.6.0', 'ios');
    const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));

    expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
    expect(query.get('subject')).toBe(FEEDBACK_SUBJECT);
    expect(query.get('body')).toBe('\n\nVersion 1.6.0 · iOS');
  });

  it('does not put recovery state in the mailto', () => {
    const url = buildFeedbackMailto('1.6.0', 'android').toLowerCase();

    expect(url).not.toContain('relapse');
    expect(url).not.toContain('check-in');
    expect(url).not.toContain('checkin');
    expect(url).not.toContain('mood');
    expect(url).not.toContain('round');
  });

  it('shows the address, subject, and version line in the fallback', () => {
    expect(feedbackFallbackMessage('1.6.0', 'android')).toBe(
      `${FEEDBACK_EMAIL}\n${FEEDBACK_SUBJECT}\n${feedbackVersionLine('1.6.0', 'android')}`,
    );
  });

  it('opens the mail app when mailto is available', async () => {
    const opened: string[] = [];
    const result = await openFeedbackMail('1.6.0', 'ios', {
      canOpenURL: async () => true,
      openURL: async (url) => {
        opened.push(url);
      },
    });

    expect(result).toBe('opened');
    expect(opened[0]).toContain('mailto:hiscan98@gmail.com');
  });

  it('reports unavailable when the device cannot open mail', async () => {
    const result = await openFeedbackMail('1.6.0', 'ios', {
      canOpenURL: async () => false,
      openURL: async () => {
        throw new Error('should not open');
      },
    });

    expect(result).toBe('unavailable');
  });
});
