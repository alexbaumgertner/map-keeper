import { inngest } from '../client';

/** Never auto-relink — only create pending proposals. */
export const proposeRelinkFn = inngest.createFunction(
  { id: 'matching-propose-relink' },
  { event: 'matching/propose-relink' },
  async ({ event }) => {
    return { proposals: [], placeLinkId: event.data?.placeLinkId, auto: false };
  },
);
