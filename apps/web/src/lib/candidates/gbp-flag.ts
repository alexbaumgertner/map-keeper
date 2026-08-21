/** GBP behind feature flag — never an MVP dependency. */
export function isGbpEnabled(): boolean {
  return process.env.FEATURE_GBP === 'true';
}
