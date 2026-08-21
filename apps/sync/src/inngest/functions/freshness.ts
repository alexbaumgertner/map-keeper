import { inngest } from '../client';

export const freshnessFn = inngest.createFunction(
  { id: 'notifications-freshness-scan' },
  { cron: '0 12 * * *' },
  async () => {
    return { ok: true, intervalDays: 180 };
  },
);
