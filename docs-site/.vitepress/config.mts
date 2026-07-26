import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '90 Days Recovery Tracker — Internal Docs',
  description: 'Domain glossary, architecture decisions, and agent-skill configuration for the 90 Days Recovery Tracker app.',
  srcDir: '.',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Domain', link: '/domain' },
      { text: 'Decisions', link: '/decisions/' },
      { text: 'Reference', link: '/reference/rounds-date-logic' },
      { text: 'Agent Skills', link: '/agent-skills/issue-tracker' },
    ],
    sidebar: [
      {
        text: 'Domain',
        items: [{ text: 'Glossary', link: '/domain' }],
      },
      {
        text: 'Decisions',
        items: [
          { text: 'All ADRs', link: '/decisions/' },
          { text: '0001 — Mood counts placement', link: '/decisions/0001-mood-counts-placement-in-insights' },
          { text: '0002 — Check-ins linked by date range', link: '/decisions/0002-checkins-linked-to-rounds-by-date-range' },
          { text: '0003 — Porn-specific scope', link: '/decisions/0003-porn-specific-scope' },
          { text: '0004 — Explicitness policy', link: '/decisions/0004-explicitness-policy' },
          { text: '0005 — Backdated relapse ordering', link: '/decisions/0005-backdated-relapse-ordering' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'utils/rounds.ts date logic', link: '/reference/rounds-date-logic' },
        ],
      },
      {
        text: 'Agent Skills',
        items: [
          { text: 'Issue Tracker', link: '/agent-skills/issue-tracker' },
          { text: 'Triage Labels', link: '/agent-skills/triage-labels' },
          { text: 'Domain Docs Consumer Rules', link: '/agent-skills/domain' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
  },
});
