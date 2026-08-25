const { chromium, webkit, devices } = require('playwright');

const base = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const sha = process.env.GITHUB_SHA || Date.now().toString();
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const HARD_LIMIT_MS = 240000;
const hardTimer = setTimeout(() => {
  console.error(`HARD_TIMEOUT after ${HARD_LIMIT_MS}ms: browser smoke did not finish; refusing to hang until workflow timeout`);
  process.exit(124);
}, HARD_LIMIT_MS);

const bounded = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
]);

async function diagnose(page, label) {
  let title = '', text = '', html = '';
  try { title = await bounded(page.title(), 2500, `${label} title`); } catch (_) {}
  try { text = (await bounded(page.locator('body').innerText(), 2500, `${label} body`)).slice(0, 1200); } catch (_) {}
  try { html = (await bounded(page.content(), 2500, `${label} html`)).slice(0, 1600); } catch (_) {}
  console.error(`[${label}] url=${page.url()} title=${title}`);
  console.error(`[${label}] body=${text}`);
  console.error(`[${label}] html=${html}`);
}

async function waitApp(page, label = 'app') {
  try {
    await bounded(page.waitForFunction(() => document.body?.dataset?.productVersion === '3.6.0', null, { timeout: 25000 }), 30000, `${label} product version`);
    await bounded(page.waitForSelector('#v350Home', { state: 'visible', timeout: 25000 }), 30000, `${label} home`);
    await bounded(page.waitForFunction(() => Array.isArray(window.SEC_QUESTIONS) && window.SEC_QUESTIONS.length > 100, null, { timeout: 15000 }), 20000, `${label} questions`);
  } catch (err) {
    await diagnose(page, label);
    throw err;
  }
  const state = await bounded(page.evaluate(() => ({
    version: document.body.dataset.productVersion,
    questions: window.SEC_QUESTIONS?.length || 0,
    cloudSync: window.SEC_PROFILE_SYNC_V360?.cloudSync,
    profiles: JSON.parse(localStorage.getItem('sec_v350_profiles') || '[]').length,
    home: !!document.querySelector('#v350Home'),
  })), 10000, `${label} state`);
  assert(state.version === '3.6.0', 'wrong product version');
  assert(state.questions > 100, 'question bank did not load');
  assert(state.cloudSync === false, 'local PIN was incorrectly exposed as cloud sync');
  assert(state.profiles === 2, 'two independent learner profiles were not initialized');
  assert(state.home, 'adaptive home did not render');
}

async function desktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [], failedRequests = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  page.on('console', m => { if (m.type() === 'error') console.log(`desktop console-error: ${m.text()}`); });
  const response = await bounded(page.goto(`${base}/securities-exam/?browser_smoke=${sha}`, { waitUntil: 'domcontentloaded', timeout: 45000 }), 50000, 'desktop navigation');
  console.log(`desktop navigation status=${response?.status()} url=${page.url()}`);
  await waitApp(page, 'desktop-load');
  await page.waitForSelector('#v350DesktopChrome .v350Side', { state: 'visible', timeout: 15000 });

  const desktopFont = await page.locator('#v350DesktopChrome .v350Side nav button').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert(desktopFont >= 14, `desktop navigation font too small: ${desktopFont}`);

  await page.locator('#v350DesktopChrome [data-v350-nav="knowledge"]').click();
  await page.waitForSelector('#view-knowledge.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#v350ConceptList button', { state: 'visible', timeout: 20000 });
  assert(await page.locator('#v350ConceptList button').count() > 0, 'knowledge map is empty');

  await page.locator('#v350DesktopChrome [data-v350-nav="practice"]').click();
  await page.waitForSelector('#view-practice.active', { state: 'visible', timeout: 15000 });

  await page.locator('#v350DesktopChrome [data-v350-account]').click();
  await page.waitForSelector('#v350AccountModal.show .v360PinPanel', { state: 'visible', timeout: 15000 });
  await page.locator('[data-v360-remember]').uncheck();
  await page.locator('[data-v360-pin]').fill('2468');
  await page.locator('[data-v360-setpin]').click();
  await page.waitForTimeout(400);
  const auth = await page.evaluate(() => {
    const profiles = JSON.parse(localStorage.getItem('sec_v350_profiles') || '[]');
    const active = localStorage.getItem('sec_v350_active');
    const map = JSON.parse(localStorage.getItem('sec_v360_local_auth') || '{}');
    return { profiles, active, entry: map[active] || null };
  });
  assert(auth.entry?.hash?.length === 64, 'PIN hash was not stored');
  assert(auth.entry.hash !== '2468', 'PIN was stored in plaintext');

  const before = auth.active;
  const switchButton = page.locator('#v350AccountModal [data-switch]').first();
  assert(await switchButton.count() === 1, 'second learner switch button missing');
  await switchButton.click();
  await page.waitForLoadState('domcontentloaded');
  await waitApp(page, 'desktop-after-profile-switch');
  const after = await page.evaluate(() => localStorage.getItem('sec_v350_active'));
  assert(after && after !== before, 'learner profile did not switch');

  if (pageErrors.length || failedRequests.length) {
    console.log(`desktop pageErrors=${pageErrors.join(' | ') || 'none'}`);
    console.log(`desktop failedRequests=${failedRequests.slice(0, 10).join(' | ') || 'none'}`);
  }
  assert(pageErrors.length === 0, `desktop page errors: ${pageErrors.join(' | ')}`);
  await context.close();
  console.log('desktop Chromium PASS');
}

async function mobile(browser, label, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...contextOptions });
  const page = await context.newPage();
  const pageErrors = [], failedRequests = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('requestfailed', r => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText || 'failed'}`));
  page.on('console', m => { if (m.type() === 'error') console.log(`${label} console-error: ${m.text()}`); });
  const response = await bounded(page.goto(`${base}/ks/?browser_smoke=${sha}&engine=${label}`, { waitUntil: 'domcontentloaded', timeout: 45000 }), 50000, `${label} entry navigation`);
  console.log(`${label} entry status=${response?.status()} url=${page.url()}`);
  await bounded(page.waitForURL(/\/securities-exam\/(?:\?|$)/, { timeout: 15000 }), 20000, `${label} recovery redirect`);
  assert(!page.url().includes('boot.html'), `${label} remained stuck on recovery page`);
  await waitApp(page, `${label}-load`);
  await page.waitForSelector('#v350MobileChrome .v350MobileTop', { state: 'visible', timeout: 20000 });
  const mobileFont = await page.locator('#v350MobileChrome .v350MobileTop b').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert(mobileFont >= 17, `${label} mobile top font too small: ${mobileFont}`);
  await page.locator('#v350MobileChrome [data-v350-nav="knowledge"]').click();
  await page.waitForSelector('#view-knowledge.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#v350ConceptList button', { state: 'visible', timeout: 20000 });
  if (pageErrors.length || failedRequests.length) {
    console.log(`${label} pageErrors=${pageErrors.join(' | ') || 'none'}`);
    console.log(`${label} failedRequests=${failedRequests.slice(0, 10).join(' | ') || 'none'}`);
  }
  assert(pageErrors.length === 0, `${label} page errors: ${pageErrors.join(' | ')}`);
  await context.close();
  console.log(`${label} PASS`);
}

(async () => {
  const chromiumBrowser = await chromium.launch({ headless: true });
  try {
    await desktop(chromiumBrowser);
    await mobile(chromiumBrowser, 'chromium-mobile');
  } finally {
    await chromiumBrowser.close().catch(() => {});
  }

  const webkitBrowser = await webkit.launch({ headless: true });
  try {
    const iphone = devices['iPhone 13'];
    await mobile(webkitBrowser, 'webkit-iphone', { userAgent: iphone.userAgent, deviceScaleFactor: iphone.deviceScaleFactor });
  } finally {
    await webkitBrowser.close().catch(() => {});
  }

  clearTimeout(hardTimer);
  console.log('Securities browser smoke PASS: Chromium desktop/mobile + WebKit iPhone recovery + core learning flows');
})().catch(err => {
  clearTimeout(hardTimer);
  console.error(err);
  process.exit(1);
});
