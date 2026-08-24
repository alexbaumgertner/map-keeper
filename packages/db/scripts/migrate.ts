import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const env = (globalThis as { process?: { env?: Record<string, string | undefined>; exit: (c: number) => never } }).process;
const url = env?.env?.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required to apply schema');
  env?.exit(1);
}

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), '../sql/init.sql');
const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql.unsafe(readFileSync(sqlPath, 'utf8'));
  console.log('Applied packages/db/sql/init.sql');
} finally {
  await sql.end();
}
