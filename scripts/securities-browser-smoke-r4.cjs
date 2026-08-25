const { chromium, webkit, devices } = require('playwright');
const base = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const sha = process.env.GITHUB_SHA || Date.now().toString();
const assert = (v, m) => { if (!v) throw new Error(m); };

async function waitApp(page, label) {
  try {
    await page.waitForFunction(() => document.body?.dataset?.productVersion === '3.6.0', null, { timeout: 30000 });
    await page.waitForSelector('#v350Home', { state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => Array.isArray(window.SEC_QUESTIONS) && window.SEC_QUESTIONS.length > 100, null, { timeout: 20000 });
  } catch (e) {
    console.error(`[${label}] url=${page.url()}`);
    console.error(`[${label}] title=${await page.title().catch(()=> '')}`);
    console.error(`[${label}] body=${(await page.locator('body').innerText().catch(()=> '')).slice(0,1200)}`);
    console.error(`[${label}] html=${(await page.content().catch(()=> '')).slice(0,1600)}`);
    throw e;
  }
  const s = await page.evaluate(() => ({
    version: document.body.dataset.productVersion,
    questions: window.SEC_QUESTIONS?.length || 0,
    cloudSync: window.SEC_PROFILE_SYNC_V360?.cloudSync,
    profiles: JSON.parse(localStorage.getItem('sec_v350_profiles') || '[]').length,
    swController: !!navigator.serviceWorker?.controller,
  }));
  assert(s.version === '3.6.0', `${label}: wrong version`);
  assert(s.questions > 100, `${label}: question bank missing`);
  assert(s.cloudSync === false, `${label}: cloud sync claim wrong`);
  assert(s.profiles === 2, `${label}: two profiles missing`);
  assert(s.swController === false, `${label}: clean entry unexpectedly controlled by service worker`);
}

async function desktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const r = await page.goto(`${base}/exam-live/?smoke=${sha}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`desktop status=${r?.status()} url=${page.url()}`);
  await waitApp(page, 'desktop');
  await page.locator('#v350DesktopChrome [data-v350-nav="knowledge"]').click();
  await page.waitForSelector('#view-knowledge.active #v350ConceptList button', { state: 'visible', timeout: 20000 });
  await page.locator('#v350DesktopChrome [data-v350-nav="practice"]').click();
  await page.waitForSelector('#view-practice.active', { state: 'visible', timeout: 15000 });
  await page.locator('#v350DesktopChrome [data-v350-account]').click();
  await page.waitForSelector('#v350AccountModal.show .v360PinPanel', { state: 'visible', timeout: 15000 });
  await page.locator('[data-v360-remember]').uncheck();
  await page.locator('[data-v360-pin]').fill('2468');
  await page.locator('[data-v360-setpin]').click();
  const auth = await page.evaluate(() => {
    const active = localStorage.getItem('sec_v350_active');
    const map = JSON.parse(localStorage.getItem('sec_v360_local_auth') || '{}');
    return map[active] || null;
  });
  assert(auth?.hash?.length === 64 && auth.hash !== '2468', 'desktop: PIN hashing failed');
  const before = await page.evaluate(() => localStorage.getItem('sec_v350_active'));
  const switchBtn = page.locator('#v350AccountModal [data-switch]').first();
  assert(await switchBtn.count() === 1, 'desktop: profile switch missing');
  await switchBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await waitApp(page, 'desktop-after-switch');
  const after = await page.evaluate(() => localStorage.getItem('sec_v350_active'));
  assert(after && after !== before, 'desktop: profile did not switch');
  assert(errors.length === 0, `desktop pageerror: ${errors.join(' | ')}`);
  await browser.close();
  console.log('desktop Chromium PASS');
}

async function mobile(engine, label, options={}) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const r = await page.goto(`${base}/ks/?smoke=${sha}&engine=${label}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`${label} entry status=${r?.status()} url=${page.url()}`);
  await page.waitForURL(/\/exam-live\/(?:\?|$)/, { timeout: 20000 });
  assert(!page.url().includes('boot.html'), `${label}: recovery page still in path`);
  await waitApp(page, label);
  await page.waitForSelector('#v350MobileChrome .v350MobileTop', { state: 'visible', timeout: 20000 });
  await page.locator('#v350MobileChrome [data-v350-nav="knowledge"]').click();
  await page.waitForSelector('#view-knowledge.active #v350ConceptList button', { state: 'visible', timeout: 20000 });
  assert(errors.length === 0, `${label} pageerror: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${label} PASS`);
}

(async()=>{
  const hard = setTimeout(()=>{ console.error('HARD_TIMEOUT 240s'); process.exit(124); }, 240000);
  await desktop();
  await mobile(chromium, 'chromium-mobile');
  const iphone = devices['iPhone 13'];
  await mobile(webkit, 'webkit-iphone', { userAgent: iphone.userAgent, deviceScaleFactor: iphone.deviceScaleFactor });
  clearTimeout(hard);
  console.log('R4 clean-entry smoke PASS: Chromium desktop/mobile + WebKit iPhone + core flows');
})().catch(e => { console.error(e); process.exit(1); });
