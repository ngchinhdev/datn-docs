/*
 * Full-page screenshots of mock routes, to compare with design/screens by eye.
 * Run: pnpm shot <route>... [--phone] [--dark] [--collapsed] [--height <px>] [--login <email>] [--session <key>=<json>]
 * Needs `pnpm dev` running on port 3100. Images go to `.shots/<route>[-phone][-dark][-collapsed].png`.
 * With `--login`, the sign-in form is filled and sent first (the session is kept per tab); for
 * routes under `/mock/admin` it is the form of `/mock/admin/login`.
 * With `--collapsed`, the sidebar of the app frame starts as the 68px rail.
 * With `--height <px>`, the window is that tall: the app frame scrolls inside itself, so a tall window shows more of a long page.
 * With `--session key=value` (repeatable), a value is put in sessionStorage before the page loads:
 * the draft that a later step of a flow needs, such as `sapio.signup`.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { SAMPLE_PASSWORD } from '../mock/fixtures/accounts.ts';

const ORIGIN = 'http://localhost:3100';
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const loginAt = args.indexOf('--login');
const loginEmail = loginAt >= 0 ? args[loginAt + 1] : undefined;
const heightAt = args.indexOf('--height');
const isSessionValue = (i: number) => args[i - 1] === '--session';
const routes = args.filter(
  (a, i) =>
    !a.startsWith('--') &&
    !isSessionValue(i) &&
    (loginAt < 0 || i !== loginAt + 1) &&
    (heightAt < 0 || i !== heightAt + 1),
);
const sessionItems = args.filter((_, i) => isSessionValue(i));

if (routes.length === 0) {
  console.error(
    'Usage: pnpm shot <route>... [--phone] [--dark] [--collapsed] [--height <px>] [--login <email>] [--session <key>=<json>]',
  );
  process.exit(1);
}

const phone = flag('phone');
const dark = flag('dark');
const height = heightAt >= 0 ? Number(args[heightAt + 1]) : undefined;
const viewport = phone
  ? { width: 390, height: height ?? 844 }
  : { width: 1440, height: height ?? 900 };

mkdirSync('.shots', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
// next-themes reads this key before the first paint.
await context.addInitScript(
  (theme) => localStorage.setItem('theme', theme),
  dark ? 'dark' : 'light',
);
for (const item of sessionItems) {
  const at = item.indexOf('=');
  await context.addInitScript(
    ([key, value]) => sessionStorage.setItem(key!, value!),
    [item.slice(0, at), item.slice(at + 1)],
  );
}
// The sidebar of the app frame keeps its choice here.
if (flag('collapsed')) {
  await context.addInitScript(() => localStorage.setItem('sapio.sidebar', 'collapsed'));
}
const page = await context.newPage();

if (loginEmail) {
  // Routes of the administration sign in at its own door (T-18).
  const door = routes[0]?.startsWith('/mock/admin') ? '/mock/admin/login' : '/mock/login';
  await page.goto(`${ORIGIN}${door}`);
  await page.fill('#li-mail', loginEmail);
  await page.fill('#li-pass', SAMPLE_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith(door));
}

for (const route of routes) {
  await page.goto(`${ORIGIN}${route}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = route.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-') || 'index';
  const file = `.shots/${name}${phone ? '-phone' : ''}${dark ? '-dark' : ''}${flag('collapsed') ? '-collapsed' : ''}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

await browser.close();
