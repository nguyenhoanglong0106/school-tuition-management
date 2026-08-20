import { chromium } from 'playwright';
import path from 'path';

const OUT_DIR = process.argv[2];
const BASE = 'http://localhost:5173';

const routes = [
  { path: '/app', file: 'home.png', wait: 800 },
  { path: '/app/classes', file: 'classes.png', wait: 500 },
  { path: '/app/schedule', file: 'schedule.png', wait: 500 },
  { path: '/app/attendance', file: 'attendance.png', wait: 500 },
  { path: '/app/fees', file: 'fees.png', wait: 500 },
  { path: '/app/payments', file: 'payments.png', wait: 500 },
  { path: '/app/documents', file: 'documents.png', wait: 500 },
  { path: '/app/notifications', file: 'notifications.png', wait: 500 },
  { path: '/app/profile', file: 'profile.png', wait: 500 },
  { path: '/app/more', file: 'more.png', wait: 500 },
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();

console.log('Opening login page...');
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('#identifier', 'HS000001');
await page.fill('#password', '1231234');
await Promise.all([
  page.waitForURL('**/app**', { timeout: 15000 }),
  page.click('#btn-login'),
]);
console.log('Logged in, current URL:', page.url());

const redact = () => {
  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRe = /0\d{9,10}\b/g;
  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{6,12}/gi;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    if (!node.nodeValue) continue;
    let v = node.nodeValue;
    v = v.replace(emailRe, 'email@vidu.com');
    v = v.replace(uuidRe, (m) => 'demo_' + m.slice(0, 8));
    node.nodeValue = v;
  }
  document.querySelectorAll('img.rounded-full').forEach((img) => {
    img.style.filter = 'blur(20px)';
  });
};

for (const r of routes) {
  await page.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(r.wait);
  await page.evaluate(redact);
  const filePath = path.join(OUT_DIR, r.file);
  await page.screenshot({ path: filePath });
  console.log('Saved', filePath);
}

await browser.close();
console.log('Done');
