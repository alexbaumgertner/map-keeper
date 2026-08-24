import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Error: DATABASE_URL environment variable is required.');
  console.error('  For production: run `pnpm db:setup:prod` from repo root.');
  console.error('  For local:      set DATABASE_URL in apps/web/.env.local and run `pnpm db:migrate`.');
  process.exit(1);
}

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), '../sql/init.sql');
console.log('Applying schema from', sqlPath, '...');

const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql.unsafe(readFileSync(sqlPath, 'utf8'));
  console.log('Done — schema is up to date.');
} finally {
  await sql.end();
}

