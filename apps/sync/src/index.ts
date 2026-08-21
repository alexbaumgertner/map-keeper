import { reconcileFn } from './inngest/functions/reconcile';
import { digestFn } from './inngest/functions/digest';
import { freshnessFn } from './inngest/functions/freshness';
import { proposeRelinkFn } from './inngest/functions/propose-relink';

export const functions = [reconcileFn, digestFn, freshnessFn, proposeRelinkFn];

console.log(
  'Mapkeeper sync worker ready:',
  functions.map((f) => f.id).join(', '),
);
