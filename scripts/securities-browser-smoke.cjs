const { chromium } = require('playwright');

const base = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const sha = process.env.GITHUB_SHA || Date.now().toString();
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

async function waitApp(page) {
  await page.waitForFunction(() => document.body?.dataset?.productVersion === '3.6.0', null, { timeout: 45000 });
  await page.waitForSelector('#v350Home', { state: 'visible', timeout: 45000 });
  await page.waitForFunction(() => Array.isArray(window.SEC_QUESTIONS) && window.SEC_QUESTIONS.length > 100, null, { timeout: 20000 });
  const state = await page.evaluate(() => ({
    version: document.body.dataset.productVersion,
    questions: window.SEC_QUESTIONS?.length || 0,
    cloudSync: window.SEC_PROFILE_SYNC_V360?.cloudSync,
    profiles: JSON.parse(localStorage.getItem('sec_v350_profiles') || '[]').length,
    home: !!document.querySelector('#v350Home'),
  }));
  assert(state.version === '3.6.0', 'wrong product version');
  assert(state.questions > 100, 'question bank did not load');
  assert(state.cloudSync === false, 'local PIN was incorrectly exposed as cloud sync');
  assert(state.profiles === 2, 'two independent learner profiles were not initialized');
  assert(state.home, 'adaptive home did not render');
}

async function desktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(`${base}/securities-exam/?browser_smoke=${sha}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitApp(page);
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
  await waitApp(page);
  const after = await page.evaluate(() => localStorage.getItem('sec_v350_active'));
  assert(after && after !== before, 'learner profile did not switch');

  assert(pageErrors.length === 0, `desktop page errors: ${pageErrors.join(' | ')}`);
  await context.close();
}

async function mobile(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  await page.goto(`${base}/ks/?browser_smoke=${sha}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForURL(/\/securities-exam\/(?:\?|$)/, { timeout: 60000 });
  await waitApp(page);
  await page.waitForSelector('#v350MobileChrome .v350MobileTop', { state: 'visible', timeout: 20000 });
  const mobileFont = await page.locator('#v350MobileChrome .v350MobileTop b').evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert(mobileFont >= 17, `mobile top font too small: ${mobileFont}`);
  await page.locator('#v350MobileChrome [data-v350-nav="knowledge"]').click();
  await page.waitForSelector('#view-knowledge.active', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#v350ConceptList button', { state: 'visible', timeout: 20000 });
  assert(pageErrors.length === 0, `mobile page errors: ${pageErrors.join(' | ')}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await desktop(browser);
    await mobile(browser);
    console.log('Securities browser smoke PASS: direct app + ks recovery entry + knowledge + practice + two profiles + PIN + typography');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
