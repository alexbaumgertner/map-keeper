/**
 * Playwright check for claim-by-OSM-id.
 * Usage (from repo): MAP_KEEPER_ROOT=$PWD node /path/to/check — or run via temp dir with playwright installed.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadSecrets() {
  const path = resolve(
    process.env.MAP_KEEPER_ROOT ?? '/Users/alexbaumgertner/Projects/map-keeper',
    'apps/web/.env.secrets.local',
  );
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const BASE = 'http://127.0.0.1:3000';
const results = [];
function ok(name, detail = '') {
  results.push({ name, pass: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

const secrets = loadSecrets();
const email = secrets.OSM_DEV_LOGIN_EMAIL;
const password = secrets.OSM_DEV_LOGIN_PASSWORD;
if (!email || !password) {
  console.error('Missing OSM_DEV_LOGIN_*');
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(`${BASE}/claim`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Claim by map object id' }).waitFor();
  await page.getByPlaceholder('Name or address').waitFor();
  ok('UI: secondary identity section present with primary search');

  await page.getByPlaceholder(/relation\/4305236658/).fill('relation/4305236658');
  await page.getByRole('button', { name: 'Look up' }).click();
  await page.getByText(/sign in required/i).waitFor({ timeout: 15000 });
  ok('Auth gate: look-up requires sign-in');

  await page.goto(`${BASE}/api/v1/auth/osm/start?redirect=%2Fclaim`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.getByLabel('Email Address or Username').fill(email);
  await page.getByLabel('Password').fill(password);
  await Promise.all([
    page.waitForURL(/127\.0\.0\.1:3000\/(claim|places|api)/, { timeout: 60000 }),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]).catch(async () => {
    // Consent screen
    const authBtn = page.getByRole('button', { name: /Authorize|Grant|Allow/i });
    if (await authBtn.count()) {
      await Promise.all([
        page.waitForURL(/127\.0\.0\.1:3000/, { timeout: 60000 }),
        authBtn.click(),
      ]);
    }
  });

  // Ensure on claim
  if (!page.url().includes('/claim')) {
    await page.goto(`${BASE}/claim`, { waitUntil: 'domcontentloaded' });
  }
  await page.getByRole('heading', { name: 'Claim by map object id' }).waitFor({ timeout: 15000 });
  const signIn = await page.getByRole('link', { name: 'Sign in with OpenStreetMap' }).count();
  if (signIn === 0) ok('OAuth: signed in (no Sign in link)');
  else fail('OAuth: signed in', page.url());

  // Look up
  const idInput = page.getByPlaceholder(/relation\/4305236658/);
  await idInput.fill('relation/4305236658');
  await page.getByRole('button', { name: 'Look up' }).click();
  const section = page.locator('section').filter({ hasText: 'Claim by map object id' });
  await section.getByRole('button', { name: 'Claim / watch' }).waitFor({ timeout: 30000 });
  const preview = await section.innerText();
  if (/4305236658/.test(preview)) ok('Look-up: preview for relation/4305236658');
  else fail('Look-up: preview', preview.slice(0, 200));

  const cat = await section.locator('select').inputValue();
  if (cat === 'other') ok('Category defaults to other');
  else fail('Category default', cat);

  await section.getByRole('button', { name: 'Claim / watch' }).click();
  await page.waitForTimeout(2000);
  let after = await section.innerText();
  if (/Claimed|Already watching/i.test(after)) ok('Claim: created or already watched', after.match(/Claimed[^\n]*|Already watching[^\n]*/)?.[0]);
  else fail('Claim', after.slice(0, 250));

  // Soft duplicate
  if (await section.getByRole('button', { name: 'Claim / watch' }).count()) {
    await section.getByRole('button', { name: 'Claim / watch' }).click();
    await page.waitForTimeout(2000);
  }
  after = await section.innerText();
  if (/Already watching/i.test(after)) ok('Duplicate: already watching message');
  else fail('Duplicate soft success', after.slice(0, 250));

  // Missing
  await idInput.fill('node/1');
  await page.getByRole('button', { name: 'Look up' }).click();
  await page.waitForTimeout(2500);
  after = await section.innerText();
  if (/not found/i.test(after)) ok('Missing: not found on editing host');
  else fail('Missing', after.slice(0, 200));

  // URL paste
  await idInput.fill('https://api06.dev.openstreetmap.org/relation/4305236658');
  await page.getByRole('button', { name: 'Look up' }).click();
  await section.getByRole('button', { name: 'Claim / watch' }).waitFor({ timeout: 30000 });
  ok('Paste URL: api06 look-up shows Claim / watch');
} catch (err) {
  fail('Unhandled', err instanceof Error ? err.message : String(err));
  try {
    await page.screenshot({ path: '/tmp/mk-pw-check/error.png', fullPage: true });
    console.log('screenshot /tmp/mk-pw-check/error.png');
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
