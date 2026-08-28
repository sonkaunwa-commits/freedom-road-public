const { chromium, webkit, devices } = require('playwright');

const BASE = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY = `${BASE}/ks/?smoke=${Date.now()}`;
const PRIMARY_PIN = '0917';
const SECONDARY_PIN = '4294';
const assert = async (condition, message) => { if (!condition) throw new Error(message); };

async function waitRuntime(page) {
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0' && window.SEC_QUIZ_V41?.version === '4.1.0' && window.SEC_QUIZ_V42?.version === '4.2.0' && window.SEC_QUIZ_V43?.version === '4.3.1' && window.SEC_CLOUD_SYNC_V43?.mode === 'two-pin-isolated-cloud-state', null, { timeout: 25000 });
}
async function authenticate(page, pin) {
  await page.waitForSelector('.v43LoginCard', { timeout: 15000 });
  const card = page.locator('.v43LoginCard');
  const authText = await card.innerText();
  await assert(!authText.includes(PRIMARY_PIN) && !authText.includes(SECONDARY_PIN), 'login UI reveals valid study codes');
  const form = page.locator('[data-pin-form]');
  await assert((await page.locator('[data-auth-tab]').count()) === 0, 'legacy login/register tabs still visible');
  await form.locator('[name="pin"]').fill(pin);
  await form.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('.v43Auth.show'), null, { timeout: 25000 });
  await page.waitForSelector('.subject .continue', { timeout: 25000 });
}
async function openAndAuth(page, pin, suffix='') {
  const r = await page.goto(ENTRY + `&case=${suffix}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await assert(r && r.ok(), `${suffix}: /ks/ entry not 2xx`);
  await waitRuntime(page);
  await assert(page.url().includes('/quiz-v4/'), `${suffix}: /ks/ did not resolve to v4`);
  await authenticate(page, pin);
}
async function accountMeta(page) {
  return page.evaluate(() => {
    const u = JSON.parse(localStorage.getItem('sec_v43_cloud_user') || 'null');
    return { id: u?.id || '', username: u?.username || '', displayName: u?.displayName || '', token: localStorage.getItem('sec_v43_cloud_token') || '' };
  });
}
async function waitCloudAccount(page, expectedUsername) {
  await page.waitForFunction((expected) => {
    try {
      const u = JSON.parse(localStorage.getItem('sec_v43_cloud_user') || 'null');
      return u?.username === expected && !!u?.id && !!localStorage.getItem('sec_v43_cloud_token');
    } catch (_) { return false; }
  }, expectedUsername, { timeout: 18000 });
  return accountMeta(page);
}

async function exercise(browserType, name, contextOptions) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [], badResponses = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', m => { if (m.type()==='error' && !m.text().includes('Failed to load resource')) errors.push(`console:${m.text()}`); });
  page.on('response', r => { if (r.status()>=400 && !r.url().endsWith('/favicon.ico')) badResponses.push(`${r.status()}:${r.url()}`); });
  await openAndAuth(page, PRIMARY_PIN, name);
  await page.waitForSelector('.qualitySummary');
  const bank = await page.evaluate(() => { const rows=window.SEC_QUESTIONS||[], active=rows.filter(q=>q&&q.strict!==false), q=window.SEC_V42_QUALITY||{}, b=window.SEC_V43_BANK||{}; return {total:rows.length,active:active.length,added:b.added||0,types:[...new Set(active.map(x=>x.type))],sourced:rows.filter(x=>x.source&&x.sourceTruth).length,tiered:rows.filter(x=>x.qualityTier).length,activeD:active.filter(x=>x.qualityTier==='D').length,defaultPool:q.defaultPool||0,counts:q.counts||{}}; });
  await assert(bank.active >= 1200, `${name}: expanded pool too small ${bank.active}`);
  await assert(bank.added >= 400, `${name}: v4.3 added too few questions ${bank.added}`);
  await assert(bank.total > bank.active && bank.defaultPool===bank.active && bank.activeD===0, `${name}: tier quarantine mismatch`);
  await assert(bank.sourced===bank.total && bank.tiered===bank.total, `${name}: provenance/tiering incomplete`);
  for (const t of ['single','multi','judge','comprehensive']) await assert(bank.types.includes(t), `${name}: missing ${t}`);
  const shellWidth=await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().width); await assert(shellWidth<=522, `${name}: shell ${shellWidth}`);
  const meta=await accountMeta(page); await assert(meta.username==='study_0917', `${name}: wrong PIN account ${meta.username}`);
  await page.locator('[data-tab="me"]').click(); await page.waitForSelector('.v43AccountCard');
  await assert((await page.locator('[data-profile]').count())===0, `${name}: legacy direct profile switch still visible`);
  await assert((await page.locator('.v43AccountCard').innerText()).includes('0917'), `${name}: account card missing 0917`);
  await page.reload({waitUntil:'domcontentloaded'}); await waitRuntime(page); await page.waitForSelector('.subject .continue');
  await assert((await page.locator('.v43LoginCard').count())===0, `${name}: remembered device session failed`);
  if (badResponses.length) throw new Error(`${name}: response errors ${badResponses.join(' | ')}`);
  if (errors.length) throw new Error(`${name}: runtime errors ${errors.join(' | ')}`);
  console.log(`${name} PASS pin=${PRIMARY_PIN} highValue=${bank.active}/${bank.total} added=${bank.added} shell=${shellWidth}`);
  await browser.close();
}

async function accountIsolation() {
  const browser=await chromium.launch({headless:true});
  const c1=await browser.newContext({viewport:{width:390,height:844}}), p1=await c1.newPage();
  await openAndAuth(p1, PRIMARY_PIN, 'pin-primary-a'); const a1=await waitCloudAccount(p1,'study_0917');
  const c2=await browser.newContext({viewport:{width:1280,height:900}}), p2=await c2.newPage();
  await openAndAuth(p2, PRIMARY_PIN, 'pin-primary-b'); const a2=await waitCloudAccount(p2,'study_0917');
  await assert(a1.id && a1.id===a2.id, 'same PIN did not resolve to same cloud account');
  const c3=await browser.newContext({viewport:{width:390,height:844}}), p3=await c3.newPage();
  await openAndAuth(p3, SECONDARY_PIN, 'pin-secondary'); const b=await waitCloudAccount(p3,'study_4294');
  await assert(b.username==='study_4294', 'secondary PIN did not resolve to its own account');
  await assert(b.id && b.id!==a1.id, 'the two study codes resolved to the same cloud account');
  await p3.locator('[data-tab="me"]').click(); await p3.waitForSelector('.v43AccountCard');
  await assert((await p3.locator('[data-profile]').count())===0,'secondary account can see direct profile switch');
  await assert((await p3.locator('.v43AccountCard').innerText()).includes('4294'),'secondary account card missing expected code');
  console.log('PIN account PASS instant local entry + same-code cloud identity + separate-code isolation + no direct profile switch');
  await browser.close();
}

async function releaseEntryChecks(){const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(`${BASE}/?release-check=${Date.now()}`,{waitUntil:'domcontentloaded'});const href=await p.locator('a.card').filter({hasText:'证券从业 2026'}).getAttribute('href');await assert(href&&href.startsWith('ks/'),'root card route wrong');await p.goto(`${BASE}/securities-exam/?legacy=${Date.now()}`,{waitUntil:'domcontentloaded'});await p.waitForURL(/\/quiz-v4\//);await waitRuntime(p);await p.waitForSelector('[data-pin-form]');const authText=await p.locator('.v43LoginCard').innerText();await assert(!authText.includes(PRIMARY_PIN)&&!authText.includes(SECONDARY_PIN),'legacy entry reveals valid study codes');console.log('release entry PASS root-card=/ks/ legacy=/securities-exam/->/quiz-v4/ hidden-code gate');await browser.close()}

(async()=>{await exercise(chromium,'chromium-desktop-mobile-shell',{viewport:{width:1280,height:900}});await exercise(chromium,'chromium-mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await exercise(webkit,'webkit-iphone',{...devices['iPhone 13']});await accountIsolation();await releaseEntryChecks();console.log('V4.3.1 release smoke PASS: hidden fixed PINs + instant local entry + isolated cloud accounts + remembered sessions + high-value bank');})().catch(e=>{console.error(e.stack||e);process.exit(1)});
