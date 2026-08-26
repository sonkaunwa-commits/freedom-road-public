const { chromium, webkit, devices } = require('playwright');

const BASE = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY = `${BASE}/ks/?smoke=${Date.now()}`;

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function exercise(browserType, name, contextOptions) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  const badResponses = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) errors.push(`console:${msg.text()}`);
  });
  page.on('response', r => {
    if (r.status() >= 400) {
      const u = r.url();
      if (!u.endsWith('/favicon.ico')) badResponses.push(`${r.status()}:${u}`);
    }
  });

  const response = await page.goto(ENTRY + `&engine=${name}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await assert(response && response.ok(), `${name}: /ks/ entry did not return 2xx`);
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0' && window.SEC_QUIZ_V41?.version === '4.1.0', null, { timeout: 20000 });
  await assert(page.url().includes('/quiz-v4/'), `${name}: /ks/ did not resolve to v4 (${page.url()})`);
  await page.waitForSelector('.subject .continue', { timeout: 15000 });
  const bankMeta = await page.evaluate(() => {
    const rows = Array.isArray(window.SEC_QUESTIONS) ? window.SEC_QUESTIONS : [];
    return { count: rows.length, types: [...new Set(rows.map(q => q.type))], sourced: rows.filter(q => q.source && q.sourceTruth).length };
  });
  await assert(bankMeta.count >= 100, `${name}: question bank unexpectedly small (${bankMeta.count})`);
  for (const t of ['single', 'multi', 'judge', 'comprehensive']) await assert(bankMeta.types.includes(t), `${name}: missing question type ${t}`);
  await assert(bankMeta.sourced === bankMeta.count, `${name}: not every question has provenance (${bankMeta.sourced}/${bankMeta.count})`);

  const shellWidth = await page.locator('.shell').evaluate(el => el.getBoundingClientRect().width);
  await assert(shellWidth <= 522, `${name}: shell is not mobile-width (${shellWidth})`);
  await assert(await page.locator('[data-tab="home"]').isVisible(), `${name}: bottom home nav missing`);
  await assert(await page.locator('[data-tab="wrong"]').isVisible(), `${name}: bottom wrong nav missing`);
  await assert(await page.locator('[data-tab="me"]').isVisible(), `${name}: bottom me nav missing`);

  await page.locator('[data-subject="finance"]').click();
  await page.waitForSelector('.questionCard .option', { timeout: 15000 });
  await page.waitForSelector('.sourceStrip', { timeout: 10000 });
  await assert((await page.locator('.sourceStrip').innerText()).includes('题源'), `${name}: provenance strip missing`);
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
  await assert(await page.locator('.v41Extra .sourceBlock').isVisible(), `${name}: source credibility block missing`);
  await assert(await page.locator('.v41Extra .deepBlock').count() >= 2, `${name}: deep explanation blocks missing`);
  const answerBarPosition = await page.locator('.answerBar').evaluate(el => getComputedStyle(el).position);
  await assert(answerBarPosition === 'static', `${name}: next button is still floating (${answerBarPosition})`);

  await page.locator('#answerBtn').click();
  await page.waitForSelector('.questionCard .option', { timeout: 10000 });
  const correctIndexes = await page.evaluate(() => {
    const text = document.querySelector('.questionCard h1')?.textContent || '';
    const q = (window.SEC_QUESTIONS || []).find(x => x.q === text);
    return q ? q.a : [0];
  });
  for (const idx of correctIndexes) await page.locator('.questionCard .option').nth(idx).click();
  await page.locator('#answerBtn').click();
  await page.waitForSelector('.result.good', { timeout: 10000 });
  await assert(await page.locator('#detailBody').isVisible(), `${name}: correct-answer details should auto expand too`);
  await assert(await page.locator('.v41Extra .sourceBlock').isVisible(), `${name}: correct-answer deep source block missing`);

  await page.locator('#answerBtn').click();
  await page.waitForSelector('.questionCard .option', { timeout: 10000 });
  await page.locator('.favBtn').click();
  await assert((await page.locator('.favBtn').textContent()) === '★', `${name}: favourite toggle failed`);

  await page.locator('#backBtn').click();
  await page.waitForSelector('[data-mode="chapter"]', { timeout: 10000 });
  await page.locator('[data-mode="chapter"]').click();
  await page.waitForSelector('.chapterBtn', { timeout: 10000 });
  await assert((await page.locator('.chapterBtn').count()) >= 5, `${name}: chapter list missing`);

  if (badResponses.length) throw new Error(`${name}: app resource failures: ${badResponses.join(' | ')}`);
  if (errors.length) throw new Error(`${name}: runtime errors: ${errors.join(' | ')}`);
  await browser.close();
  console.log(`${name} PASS entry=/ks/ questions=${bankMeta.count} source=${bankMeta.sourced} types=${bankMeta.types.join(',')} shell=${shellWidth}`);
}

async function releaseEntryChecks() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/?release-check=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const securitiesHref = await page.locator('a.card').filter({ hasText: '证券从业 2026' }).getAttribute('href');
  await assert(securitiesHref && securitiesHref.startsWith('ks/'), `root securities card is not routed through /ks/ (${securitiesHref})`);
  await page.goto(`${BASE}/securities-exam/?legacy-check=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForURL(/\/quiz-v4\//, { timeout: 15000 });
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0' && window.SEC_QUIZ_V41?.version === '4.1.0', null, { timeout: 15000 });
  await browser.close();
  console.log('release entry PASS root-card=/ks/ legacy=/securities-exam/->/quiz-v4/');
}

(async () => {
  await exercise(chromium, 'chromium-desktop-mobile-shell', { viewport: { width: 1280, height: 900 } });
  await exercise(chromium, 'chromium-mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await exercise(webkit, 'webkit-iphone', { ...devices['iPhone 13'] });
  await releaseEntryChecks();
  console.log('V4.1 release smoke PASS: source provenance + four question types + auto deep explanation + inline next + desktop/mobile/iPhone');
})().catch(err => { console.error(err.stack || err); process.exit(1); });
