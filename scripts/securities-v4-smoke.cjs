const { chromium, webkit, devices } = require('playwright');

const BASE = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const URL = `${BASE}/quiz-v4/?smoke=${Date.now()}`;

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exercise(browserType, name, contextOptions) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); });

  const response = await page.goto(URL + `&engine=${name}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await assert(response && response.ok(), `${name}: page did not return 2xx`);
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0', null, { timeout: 20000 });
  await page.waitForSelector('.subject .continue', { timeout: 15000 });
  const qCount = await page.evaluate(() => Array.isArray(window.SEC_QUESTIONS) ? window.SEC_QUESTIONS.length : 0);
  await assert(qCount >= 100, `${name}: question bank unexpectedly small (${qCount})`);

  const shellWidth = await page.locator('.shell').evaluate(el => el.getBoundingClientRect().width);
  await assert(shellWidth <= 522, `${name}: shell is not mobile-width (${shellWidth})`);
  await assert(await page.locator('[data-tab="home"]').isVisible(), `${name}: bottom home nav missing`);
  await assert(await page.locator('[data-tab="wrong"]').isVisible(), `${name}: bottom wrong nav missing`);
  await assert(await page.locator('[data-tab="me"]').isVisible(), `${name}: bottom me nav missing`);

  await page.locator('[data-subject="finance"]').click();
  await page.waitForSelector('.questionCard .option', { timeout: 15000 });
  const optionCount = await page.locator('.questionCard .option').count();
  await assert(optionCount >= 2, `${name}: options missing`);
  await assert(await page.locator('#answerBtn').isDisabled(), `${name}: answer button should start disabled`);

  const wrongIndex = await page.evaluate(() => {
    const text = document.querySelector('.questionCard h1')?.textContent || '';
    const q = (window.SEC_QUESTIONS || []).find(x => x.q === text);
    if (!q) return 0;
    for (let i = 0; i < (q.o || []).length; i++) if (!(q.a || []).includes(i)) return i;
    return 0;
  });
  await page.locator('.questionCard .option').nth(wrongIndex).click();
  await assert(!(await page.locator('#answerBtn').isDisabled()), `${name}: answer button did not enable`);
  await page.locator('#answerBtn').click();
  await page.waitForSelector('.result.bad', { timeout: 10000 });
  await assert(await page.locator('.explainBox.key').isVisible(), `${name}: key-point explanation missing`);
  await assert(await page.locator('#detailBody').isVisible(), `${name}: wrong-answer details should auto expand`);
  await assert((await page.locator('.explainBox').count()) >= 3, `${name}: explanation stack too thin`);

  await page.locator('#answerBtn').click();
  await page.waitForSelector('.questionCard .option', { timeout: 10000 });
  await page.locator('.favBtn').click();
  await assert((await page.locator('.favBtn').textContent()) === '★', `${name}: favourite toggle failed`);

  await page.locator('#backBtn').click();
  await page.waitForSelector('[data-mode="chapter"]', { timeout: 10000 });
  await page.locator('[data-mode="chapter"]').click();
  await page.waitForSelector('.chapterBtn', { timeout: 10000 });
  await assert((await page.locator('.chapterBtn').count()) >= 5, `${name}: chapter list missing`);

  if (errors.length) throw new Error(`${name}: runtime errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name} PASS questions=${qCount} shell=${shellWidth}`);
}

(async () => {
  await exercise(chromium, 'chromium-desktop-mobile-shell', { viewport: { width: 1280, height: 900 } });
  await exercise(chromium, 'chromium-mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await exercise(webkit, 'webkit-iphone', { ...devices['iPhone 13'] });
  console.log('V4 quiz smoke PASS: desktop mobile-shell + Chromium mobile + WebKit iPhone + answer/explanation/chapter flows');
})().catch(err => { console.error(err.stack || err); process.exit(1); });
