/*
 * Full-page screenshots of mock routes, to compare with design/screens by eye.
 * Run: pnpm shot <route>... [--phone] [--dark] [--login <email>]
 * Needs `pnpm dev` running on port 3100. Images go to `.shots/<route>[-phone][-dark].png`.
 * With `--login`, the sign-in form is filled and sent first (the session is kept per tab).
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { SAMPLE_PASSWORD } from '../mock/fixtures/accounts.ts';

const ORIGIN = 'http://localhost:3100';
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const loginAt = args.indexOf('--login');
const loginEmail = loginAt >= 0 ? args[loginAt + 1] : undefined;
const routes = args.filter((a, i) => !a.startsWith('--') && (loginAt < 0 || i !== loginAt + 1));

if (routes.length === 0) {
  console.error('Usage: pnpm shot <route>... [--phone] [--dark] [--login <email>]');
  process.exit(1);
}

const phone = flag('phone');
const dark = flag('dark');
const viewport = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };

mkdirSync('.shots', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
// next-themes reads this key before the first paint.
await context.addInitScript(
  (theme) => localStorage.setItem('theme', theme),
  dark ? 'dark' : 'light',
);
const page = await context.newPage();

if (loginEmail) {
  await page.goto(`${ORIGIN}/mock/login`);
  await page.fill('#li-mail', loginEmail);
  await page.fill('#li-pass', SAMPLE_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith('/mock/login'));
}

for (const route of routes) {
  await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = route.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-') || 'index';
  const file = `.shots/${name}${phone ? '-phone' : ''}${dark ? '-dark' : ''}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

await browser.close();
