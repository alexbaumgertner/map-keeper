import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

function env(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

export function createDb(connectionString = env('DATABASE_URL')) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  const client = postgres(connectionString, { prepare: false, max: 1 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export * from './schema/index';
