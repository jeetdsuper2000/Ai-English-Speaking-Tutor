export const CONFIG = {
  appName: 'FluentAI',
  apiBase: '/api',
  pricing: { free: 0, pro: 49, proPlus: 499, currency: '₹' },
  limits: { freeMinutesPerDay: 10 },
  levels: ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced'],
  correctionModes: {
    gentle:   { interrupt: ['high'],            label: 'Gentle — only major errors' },
    balanced: { interrupt: ['high','medium'],   label: 'Balanced — recommended' },
    strict:   { interrupt: ['high','medium','low'], label: 'Strict — every mistake' }
  },
  silenceTimeout: 1600
};

export const DB_KEY = 'fluentai.v1';