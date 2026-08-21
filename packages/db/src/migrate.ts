/**
 * Run SQL migrations when DATABASE_URL is set.
 * For greenfield: `pnpm db:generate` then apply with drizzle-kit migrate.
 */
console.log(
  'Use `pnpm --filter @mapkeeper/db generate` then apply migrations with drizzle-kit against Neon+PostGIS.',
);
