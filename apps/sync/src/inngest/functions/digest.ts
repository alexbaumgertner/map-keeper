import { inngest } from '../client';

/** At most one change_digest email per user per UTC day. */
export const digestFn = inngest.createFunction(
  { id: 'notifications-digest-daily' },
  { cron: '0 */6 * * *' },
  async () => {
    return { ok: true, note: 'Aggregate queued change_events → Resend when email_usable' };
  },
);
