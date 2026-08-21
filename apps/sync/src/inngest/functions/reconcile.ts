import { inngest } from '../client';
import { reconcileBatch, type WatchedRef } from '../../monitoring/change-source';

export const reconcileFn = inngest.createFunction(
  { id: 'monitoring-reconcile' },
  { event: 'monitoring/reconcile' },
  async ({ event }) => {
    const refs = (event.data?.refs ?? []) as WatchedRef[];
    return reconcileBatch(refs);
  },
);
